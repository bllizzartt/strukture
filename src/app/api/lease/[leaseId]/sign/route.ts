import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { sendTenantSignedEmail } from '@/lib/email';

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
    const { signature } = await request.json();

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
        unit: {
          include: {
            property: {
              select: {
                ownerId: true,
                name: true,
                owner: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
          },
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
    const now = new Date();

    // Determine if this is tenant or landlord signing (match by ID or email)
    const matchesTenant = session.user.id === lease.tenantId || session.user.email === lease.tenant.email;
    const matchesLandlord = session.user.id === lease.unit.property.ownerId;

    // Determine signing role - prioritize based on what still needs signing
    // This prevents a user who matches both (e.g., testing) from signing the wrong one
    let signingAs: 'tenant' | 'landlord' | null = null;
    if (matchesTenant && !lease.tenantSignedAt) {
      signingAs = 'tenant';
    } else if (matchesLandlord && !lease.landlordSignedAt) {
      signingAs = 'landlord';
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
    }

    // Also check session role as fallback - if user role is TENANT, sign as tenant
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

    if (signingAs === 'tenant') {
      // If tenant matched by email but has a different user ID, update the lease
      const needsTenantIdUpdate = session.user.id !== lease.tenantId;

      // Tenant signs - check if landlord already signed to activate
      const shouldActivate = !!lease.landlordSignedAt;

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

      // If both signed, activate the lease and update unit
      if (shouldActivate) {
        await prisma.unit.update({
          where: { id: lease.unitId },
          data: { status: 'OCCUPIED' },
        });
      }

      // Update tenant status to ACTIVE if pending
      await prisma.user.updateMany({
        where: { id: session.user.id, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });

      // Notify landlord that tenant has signed
      if (!shouldActivate) {
        const tenantName = session.user.name || `${lease.tenant.firstName} ${lease.tenant.lastName}`;
        await sendTenantSignedEmail(lease.unit.property.owner.email, {
          landlordName: `${lease.unit.property.owner.firstName} ${lease.unit.property.owner.lastName}`,
          tenantName,
          propertyName: lease.unit.property.name,
          unitNumber: lease.unit.unitNumber,
          leaseId,
        });
      }
    } else {
      // Landlord signs - check if tenant already signed to activate
      const shouldActivate = !!lease.tenantSignedAt;

      await prisma.lease.update({
        where: { id: leaseId },
        data: {
          landlordSignature: signature,
          landlordSignedAt: now,
          landlordSignedIp: ip,
          ...(shouldActivate ? { status: 'ACTIVE' } : {}),
        },
      });

      // If both signed, activate the lease and update unit
      if (shouldActivate) {
        await prisma.unit.update({
          where: { id: lease.unitId },
          data: { status: 'OCCUPIED' },
        });
      }
    }

    const isTenant = signingAs === 'tenant';

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: isTenant ? 'TENANT_SIGN_LEASE' : 'LANDLORD_SIGN_LEASE',
        entityType: 'Lease',
        entityId: leaseId,
        ipAddress: ip,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Lease signed successfully${isTenant && !lease.landlordSignedAt ? '. Waiting for landlord signature.' : !isTenant && !lease.tenantSignedAt ? '. Waiting for tenant signature.' : '. Lease is now active!'}`,
    });
  } catch (error) {
    console.error('Error signing lease:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sign lease' },
      { status: 500 }
    );
  }
}
