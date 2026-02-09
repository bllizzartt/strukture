import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// POST /api/landlord/leases/[leaseId]/terminate - Terminate a lease
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { leaseId } = await params;

    // Get the lease and verify ownership
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

    if (lease.unit.property.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Terminate the lease
    await prisma.lease.update({
      where: { id: leaseId },
      data: {
        status: 'TERMINATED',
        moveOutDate: new Date(),
      },
    });

    // Set unit back to vacant
    await prisma.unit.update({
      where: { id: lease.unitId },
      data: { status: 'VACANT' },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'TERMINATE_LEASE',
        entityType: 'Lease',
        entityId: leaseId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Lease terminated and unit is now vacant',
    });
  } catch (error) {
    console.error('Error terminating lease:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to terminate lease' },
      { status: 500 }
    );
  }
}
