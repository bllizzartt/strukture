import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

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
        unit: {
          include: {
            property: { select: { ownerId: true } },
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

    // Determine if this is tenant or landlord signing
    const isTenant = session.user.id === lease.tenantId;
    const isLandlord = session.user.id === lease.unit.property.ownerId;

    if (!isTenant && !isLandlord) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to sign this lease' },
        { status: 403 }
      );
    }

    if (isTenant) {
      if (lease.tenantSignedAt) {
        return NextResponse.json(
          { success: false, error: 'You have already signed this lease' },
          { status: 400 }
        );
      }

      // Tenant signs - check if landlord already signed to activate
      const shouldActivate = !!lease.landlordSignedAt;

      await prisma.lease.update({
        where: { id: leaseId },
        data: {
          tenantSignature: signature,
          tenantSignedAt: now,
          tenantSignedIp: ip,
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
        where: { id: lease.tenantId, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });
    }

    if (isLandlord) {
      if (lease.landlordSignedAt) {
        return NextResponse.json(
          { success: false, error: 'You have already signed this lease' },
          { status: 400 }
        );
      }

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
      message: `Lease signed successfully${isTenant && !lease.landlordSignedAt ? '. Waiting for landlord signature.' : isLandlord && !lease.tenantSignedAt ? '. Waiting for tenant signature.' : '. Lease is now active!'}`,
    });
  } catch (error) {
    console.error('Error signing lease:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to sign lease' },
      { status: 500 }
    );
  }
}
