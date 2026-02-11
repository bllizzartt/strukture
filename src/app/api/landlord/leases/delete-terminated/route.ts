import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// DELETE /api/landlord/leases/delete-terminated - Delete all terminated leases
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all properties owned by this landlord
    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    const propertyIds = properties.map((p) => p.id);

    // Find all terminated lease IDs first
    const terminatedLeases = await prisma.lease.findMany({
      where: {
        status: 'TERMINATED',
        unit: { propertyId: { in: propertyIds } },
      },
      select: { id: true },
    });

    const leaseIds = terminatedLeases.map((l) => l.id);

    if (leaseIds.length > 0) {
      // Delete related records first to avoid foreign key constraints
      await prisma.leaseOccupant.deleteMany({
        where: { leaseId: { in: leaseIds } },
      });
      await prisma.signatureAuditLog.deleteMany({
        where: { leaseId: { in: leaseIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { entityType: 'Lease', entityId: { in: leaseIds } },
      });
    }

    // Now delete the leases
    const result = await prisma.lease.deleteMany({
      where: { id: { in: leaseIds } },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} terminated lease${result.count !== 1 ? 's' : ''} deleted`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error deleting terminated leases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete terminated leases' },
      { status: 500 }
    );
  }
}
