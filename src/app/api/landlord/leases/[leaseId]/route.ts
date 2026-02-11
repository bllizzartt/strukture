import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// DELETE /api/landlord/leases/[leaseId] - Delete a terminated/expired lease
export async function DELETE(
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
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (lease.status === 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete an active lease. Terminate it first.' },
        { status: 400 }
      );
    }

    // If canceling a pending lease, set the unit back to vacant
    if (lease.status === 'PENDING_SIGNATURE') {
      await prisma.unit.update({
        where: { id: lease.unitId },
        data: { status: 'VACANT' },
      });
    }

    // Delete related records first to avoid foreign key constraints
    await prisma.signatureAuditLog.deleteMany({
      where: { leaseId },
    });

    await prisma.auditLog.deleteMany({
      where: { entityType: 'Lease', entityId: leaseId },
    });

    await prisma.lease.delete({
      where: { id: leaseId },
    });

    return NextResponse.json({
      success: true,
      message: 'Lease deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting lease:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete lease' },
      { status: 500 }
    );
  }
}
