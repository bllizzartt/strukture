import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { sendLeaseInviteEmail } from '@/lib/email';

// POST /api/landlord/leases/[leaseId]/resend-invite - Resend invite to a specific email or all pending signers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const targetEmail = body.email?.toLowerCase(); // Optional: resend to specific email

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: { select: { id: true, email: true } },
        unit: {
          include: {
            property: {
              select: {
                ownerId: true,
                name: true,
                addressLine1: true,
                city: true,
                state: true,
                zipCode: true,
              },
            },
          },
        },
        occupants: {
          where: { type: 'CO_TENANT' },
        },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (lease.unit.property.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (lease.status !== 'PENDING_SIGNATURE') {
      return NextResponse.json(
        { success: false, error: 'Lease is not pending signature' },
        { status: 400 }
      );
    }

    const landlord = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true },
    });

    const landlordName = landlord ? `${landlord.firstName} ${landlord.lastName}` : 'Your Landlord';
    const propertyAddress = `${lease.unit.property.addressLine1}, ${lease.unit.property.city}, ${lease.unit.property.state} ${lease.unit.property.zipCode}`;

    const emailData = {
      landlordName,
      propertyName: lease.unit.property.name,
      unitNumber: lease.unit.unitNumber,
      propertyAddress,
      monthlyRent: Number(lease.monthlyRent),
      depositAmount: Number(lease.depositAmount),
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),
      leaseId: lease.id,
    };

    // Determine who to send to
    const recipients: string[] = [];

    if (targetEmail) {
      // Resend to a specific email
      const isPrimaryTenant = lease.tenant.email === targetEmail;
      const isCoTenant = lease.occupants.some(o => o.email === targetEmail);

      if (!isPrimaryTenant && !isCoTenant) {
        return NextResponse.json(
          { success: false, error: 'Email not associated with this lease' },
          { status: 400 }
        );
      }

      // Check if they already signed
      if (isPrimaryTenant && lease.tenantSignedAt) {
        return NextResponse.json(
          { success: false, error: 'This tenant has already signed' },
          { status: 400 }
        );
      }
      const coTenant = lease.occupants.find(o => o.email === targetEmail);
      if (coTenant?.signedAt) {
        return NextResponse.json(
          { success: false, error: 'This co-tenant has already signed' },
          { status: 400 }
        );
      }

      recipients.push(targetEmail);
    } else {
      // Resend to all who haven't signed yet
      if (!lease.tenantSignedAt) {
        recipients.push(lease.tenant.email);
      }
      for (const occupant of lease.occupants) {
        if (!occupant.signedAt && occupant.email) {
          recipients.push(occupant.email);
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All tenants have already signed' },
        { status: 400 }
      );
    }

    // Send emails in parallel
    const results = await Promise.allSettled(
      recipients.map(email =>
        sendLeaseInviteEmail(email, { ...emailData, tenantEmail: email })
          .then(result => ({ email, ...result }))
      )
    );

    const sent: string[] = [];
    const failed: { email: string; reason: string }[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        sent.push(result.value.email);
      } else if (result.status === 'fulfilled') {
        failed.push({ email: result.value.email, reason: result.value.error || 'Unknown error' });
      } else {
        failed.push({ email: 'unknown', reason: String(result.reason) });
      }
    }

    return NextResponse.json({
      success: true,
      message: failed.length > 0
        ? `Sent to ${sent.length} recipient(s). Failed: ${failed.map(f => `${f.email} (${f.reason})`).join(', ')}`
        : `Invite resent to ${sent.length} recipient(s)`,
      sent,
      failed,
    });
  } catch (error) {
    console.error('Error resending lease invite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend invite' },
      { status: 500 }
    );
  }
}
