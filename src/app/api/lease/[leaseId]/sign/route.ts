import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { sendTenantSignedEmail, sendLeaseFullySignedEmail } from '@/lib/email';
import * as telegramService from '@/lib/telegram';
import { createHash } from 'crypto';

// Helper to create in-app notification
async function createLeaseNotification(userId: string, title: string, message: string, link: string) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type: 'IN_APP',
        category: 'LEASE_EXPIRING', // closest category for lease events
        title,
        message,
        actionUrl: link,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to create lease notification:', error);
  }
}

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

// POST /api/lease/[leaseId]/sign - Sign a lease (tenant or landlord)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - please log in' },
        { status: 401 }
      );
    }

    const { leaseId } = await params;
    const { signature, consentText } = await request.json();

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Signature is required' },
        { status: 400 }
      );
    }

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: { select: { id: true, email: true, firstName: true, lastName: true } },
        occupants: true,
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
                owner: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
        },
        template: {
          select: { content: true },
        },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const now = new Date();

    // Determine if this is tenant, co-tenant, or landlord signing
    const matchesTenant = session.user.id === lease.tenantId || session.user.email === lease.tenant.email;
    const matchesLandlord = session.user.id === lease.unit.property.ownerId;
    const matchingCoTenant = lease.occupants.find(
      (o) => o.type === 'CO_TENANT' && (o.userId === session.user.id || o.email === session.user.email)
    );

    let signingAs: 'tenant' | 'landlord' | 'co_tenant' | null = null;
    let coTenantOccupantId: string | null = null;

    if (matchesTenant && !lease.tenantSignedAt) {
      signingAs = 'tenant';
    } else if (matchesLandlord && !lease.landlordSignedAt) {
      signingAs = 'landlord';
    } else if (matchingCoTenant && !matchingCoTenant.signedAt) {
      signingAs = 'co_tenant';
      coTenantOccupantId = matchingCoTenant.id;
    } else if (matchesTenant && lease.tenantSignedAt) {
      return NextResponse.json(
        { success: false, error: 'You have already signed this lease' },
        { status: 400 }
      );
    } else if (matchesLandlord && lease.landlordSignedAt) {
      return NextResponse.json(
        { success: false, error: 'You have already signed this lease' },
        { status: 400 }
      );
    } else if (matchingCoTenant && matchingCoTenant.signedAt) {
      return NextResponse.json(
        { success: false, error: 'You have already signed this lease' },
        { status: 400 }
      );
    }

    // Also check session role as fallback
    if (!signingAs && session.user.role === 'TENANT' && !lease.tenantSignedAt) {
      signingAs = 'tenant';
    } else if (!signingAs && session.user.role === 'LANDLORD' && !lease.landlordSignedAt) {
      signingAs = 'landlord';
    }

    if (!signingAs) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to sign this lease' },
        { status: 403 }
      );
    }

    // Generate hashes for audit trail
    const signatureHash = sha256(signature);
    const documentHash = lease.template?.content
      ? sha256(lease.template.content)
      : sha256(`lease-${leaseId}-${lease.startDate}-${lease.endDate}-${lease.monthlyRent}`);

    const signerName = session.user.name || `${session.user.email}`;
    const signerEmail = session.user.email || '';
    const signerRole = signingAs === 'landlord' ? 'LANDLORD' : 'TENANT';

    // Helper: check if ALL parties have signed (landlord + primary tenant + all co-tenants)
    const coTenants = lease.occupants.filter((o) => o.type === 'CO_TENANT');
    const checkAllSigned = (updatedField: 'tenant' | 'landlord' | 'co_tenant') => {
      const landlordSigned = updatedField === 'landlord' ? true : !!lease.landlordSignedAt;
      const tenantSigned = updatedField === 'tenant' ? true : !!lease.tenantSignedAt;
      const allCoTenantsSigned = coTenants.every((ct) =>
        ct.id === coTenantOccupantId ? true : !!ct.signedAt
      );
      return landlordSigned && tenantSigned && allCoTenantsSigned;
    };

    const defaultConsentText = `I, ${signerName}, hereby consent to sign this Residential Lease Agreement electronically. I acknowledge that my electronic signature is legally binding under the Electronic Signatures in Global and National Commerce Act (ESIGN Act, 15 U.S.C. §§ 7001-7006) and the New Mexico Uniform Electronic Transactions Act (NMSA 1978, §§ 14-16-1 to 14-16-21). I have read and agree to all terms and conditions of this lease agreement.`;

    // Create SignatureAuditLog entries
    await prisma.signatureAuditLog.createMany({
      data: [
        {
          leaseId,
          userId: session.user.id,
          action: 'CONSENT_GIVEN',
          signerName,
          signerEmail,
          signerRole,
          ipAddress: ip,
          userAgent,
          consentText: consentText || defaultConsentText,
          consentAccepted: true,
          signatureHash: null,
          documentHash,
        },
        {
          leaseId,
          userId: session.user.id,
          action: 'SIGNATURE_APPLIED',
          signerName,
          signerEmail,
          signerRole,
          ipAddress: ip,
          userAgent,
          consentText: null,
          consentAccepted: false,
          signatureHash,
          documentHash,
        },
      ],
    });

    if (signingAs === 'tenant') {
      const needsTenantIdUpdate = session.user.id !== lease.tenantId;
      const shouldActivate = checkAllSigned('tenant');

      await prisma.lease.update({
        where: { id: leaseId },
        data: {
          tenantSignature: signature,
          tenantSignedAt: now,
          tenantSignedIp: ip,
          ...(needsTenantIdUpdate ? { tenantId: session.user.id } : {}),
          ...(shouldActivate ? { status: 'ACTIVE' } : {}),
        },
      });

      // Update tenant status to ACTIVE if pending
      await prisma.user.updateMany({
        where: { id: session.user.id, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });

      // Notify landlord that tenant has signed (if not yet fully signed)
      if (!shouldActivate) {
        const tenantName = session.user.name || `${lease.tenant.firstName} ${lease.tenant.lastName}`;
        const landlordFullName = `${lease.unit.property.owner.firstName} ${lease.unit.property.owner.lastName}`;

        // Email
        await sendTenantSignedEmail(lease.unit.property.owner.email, {
          landlordName: landlordFullName,
          tenantName,
          propertyName: lease.unit.property.name,
          unitNumber: lease.unit.unitNumber,
          leaseId,
        });

        // Telegram
        const landlord = await prisma.user.findUnique({
          where: { id: lease.unit.property.ownerId },
          select: { telegramChatId: true, telegramNotifications: true },
        });
        if (landlord?.telegramNotifications && landlord.telegramChatId) {
          await telegramService.sendNotification(
            landlord.telegramChatId,
            'Tenant Signed Lease',
            `${tenantName} has signed the lease for ${lease.unit.property.name} - Unit ${lease.unit.unitNumber}. Your counter-signature is needed.`
          );
        }

        // In-app notification for landlord
        await createLeaseNotification(
          lease.unit.property.ownerId,
          'Tenant Signed Lease',
          `${tenantName} has signed the lease for ${lease.unit.property.name} - Unit ${lease.unit.unitNumber}. Please counter-sign.`,
          `/lease/sign/${leaseId}`
        );
      }

      if (shouldActivate) {
        await activateLease(lease, leaseId, signerName);
      }
    } else if (signingAs === 'co_tenant' && coTenantOccupantId) {
      // Co-tenant signs - update their occupant record
      await prisma.leaseOccupant.update({
        where: { id: coTenantOccupantId },
        data: {
          signature,
          signedAt: now,
          signedIp: ip,
          userId: session.user.id,
        },
      });

      const shouldActivate = checkAllSigned('co_tenant');
      if (shouldActivate) {
        await prisma.lease.update({
          where: { id: leaseId },
          data: { status: 'ACTIVE' },
        });
        await activateLease(lease, leaseId, signerName);
      }

      // Update co-tenant user status to ACTIVE if pending
      await prisma.user.updateMany({
        where: { id: session.user.id, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });
    } else {
      // Landlord signs
      const shouldActivate = checkAllSigned('landlord');

      await prisma.lease.update({
        where: { id: leaseId },
        data: {
          landlordSignature: signature,
          landlordSignedAt: now,
          landlordSignedIp: ip,
          ...(shouldActivate ? { status: 'ACTIVE' } : {}),
        },
      });

      if (shouldActivate) {
        await activateLease(lease, leaseId, signerName);
      }
    }

    // Helper function to activate lease
    async function activateLease(leaseData: NonNullable<typeof lease>, id: string, currentSignerName: string) {
      await prisma.unit.update({
        where: { id: leaseData.unitId },
        data: { status: 'OCCUPIED' },
      });

      const propertyAddress = `${leaseData.unit.property.addressLine1}, ${leaseData.unit.property.city}, ${leaseData.unit.property.state} ${leaseData.unit.property.zipCode}`;
      const landlordFullName = `${leaseData.unit.property.owner.firstName} ${leaseData.unit.property.owner.lastName}`;
      const tenantFullName = `${leaseData.tenant.firstName} ${leaseData.tenant.lastName}`;

      // Email both parties
      await sendLeaseFullySignedEmail({
        landlordName: landlordFullName,
        landlordEmail: leaseData.unit.property.owner.email,
        tenantName: tenantFullName,
        tenantEmail: leaseData.tenant.email,
        propertyName: leaseData.unit.property.name,
        unitNumber: leaseData.unit.unitNumber,
        propertyAddress,
        startDate: leaseData.startDate.toISOString(),
        endDate: leaseData.endDate.toISOString(),
        leaseId: id,
      });

      // Telegram to landlord
      const landlord = await prisma.user.findUnique({
        where: { id: leaseData.unit.property.ownerId },
        select: { telegramChatId: true, telegramNotifications: true },
      });
      if (landlord?.telegramNotifications && landlord.telegramChatId) {
        await telegramService.sendLeaseNotification(landlord.telegramChatId, {
          leaseId: id,
          tenantName: tenantFullName,
          propertyName: leaseData.unit.property.name,
          unitNumber: leaseData.unit.unitNumber,
          startDate: leaseData.startDate.toLocaleDateString(),
          endDate: leaseData.endDate.toLocaleDateString(),
          monthlyRent: Number(leaseData.monthlyRent),
        });
      }

      // In-app notifications for both parties
      const leaseMsg = `Lease for ${leaseData.unit.property.name} - Unit ${leaseData.unit.unitNumber} is now active.`;
      await createLeaseNotification(
        leaseData.unit.property.ownerId,
        'Lease Activated',
        `${leaseMsg} Tenant: ${tenantFullName}. Unit marked as occupied.`,
        `/landlord/leases`
      );
      await createLeaseNotification(
        leaseData.tenantId,
        'Lease Activated',
        `${leaseMsg} Welcome to your new home!`,
        `/tenant/dashboard`
      );
    }

    const actionMap = { tenant: 'TENANT_SIGN_LEASE', co_tenant: 'CO_TENANT_SIGN_LEASE', landlord: 'LANDLORD_SIGN_LEASE' };

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: actionMap[signingAs],
        entityType: 'Lease',
        entityId: leaseId,
        ipAddress: ip,
        userAgent,
      },
    });

    // Check final activation state
    const updatedLease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: { status: true },
    });

    return NextResponse.json({
      success: true,
      message: updatedLease?.status === 'ACTIVE'
        ? 'Lease signed successfully. All parties have signed — lease is now active!'
        : 'Lease signed successfully. Waiting for remaining signatures.',
    });
  } catch (error) {
    console.error('Error signing lease:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sign lease' },
      { status: 500 }
    );
  }
}
