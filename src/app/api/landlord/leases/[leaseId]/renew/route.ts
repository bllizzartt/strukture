import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// POST /api/landlord/leases/[leaseId]/renew - Create a lease renewal offer
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

    if (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - landlord or admin access required' },
        { status: 403 }
      );
    }

    const { leaseId } = await params;
    const body = await request.json();
    const { newMonthlyRent, newEndDate, newTerms } = body;

    if (!newMonthlyRent || !newEndDate) {
      return NextResponse.json(
        { success: false, error: 'newMonthlyRent and newEndDate are required' },
        { status: 400 }
      );
    }

    // Get the current lease and verify ownership
    const currentLease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        unit: {
          include: {
            property: { select: { ownerId: true } },
          },
        },
      },
    });

    if (!currentLease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (currentLease.unit.property.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (currentLease.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Only active leases can be renewed' },
        { status: 400 }
      );
    }

    // Update current lease status to RENEWED
    await prisma.lease.update({
      where: { id: leaseId },
      data: { status: 'RENEWED' },
    });

    // Create the new renewal lease
    const newLease = await prisma.lease.create({
      data: {
        previousLeaseId: leaseId,
        tenantId: currentLease.tenantId,
        unitId: currentLease.unitId,
        startDate: currentLease.endDate,
        endDate: new Date(newEndDate),
        monthlyRent: newMonthlyRent,
        depositAmount: currentLease.depositAmount,
        status: 'PENDING_SIGNATURE',
        additionalTerms: newTerms ?? null,
        gracePeriodDays: currentLease.gracePeriodDays,
        rentDueDay: currentLease.rentDueDay,
        lateFee: currentLease.lateFee,
        petDeposit: currentLease.petDeposit,
        petRent: currentLease.petRent,
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'RENEW_LEASE',
        entityType: 'Lease',
        entityId: newLease.id,
        previousValues: { previousLeaseId: leaseId },
        newValues: {
          newMonthlyRent,
          newEndDate,
          newTerms: newTerms ?? null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: newLease,
    });
  } catch (error) {
    console.error('Error renewing lease:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to renew lease' },
      { status: 500 }
    );
  }
}
