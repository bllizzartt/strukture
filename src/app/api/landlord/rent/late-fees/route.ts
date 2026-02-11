import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

const DEFAULT_LATE_FEE = 50; // $50 default late fee

// POST /api/landlord/rent/late-fees - Auto-calculate and apply late fees for overdue rent
export async function POST(request: NextRequest) {
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
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const now = new Date();

    // Find all PENDING rent payments for this landlord's properties
    const pendingRentPayments = await prisma.payment.findMany({
      where: {
        type: 'RENT',
        status: 'PENDING',
        lease: {
          status: 'ACTIVE',
          unit: {
            property: {
              ownerId: session.user.id,
            },
          },
        },
      },
      include: {
        lease: true,
      },
    });

    let appliedCount = 0;

    for (const payment of pendingRentPayments) {
      const lease = payment.lease;
      const gracePeriodDays = lease.gracePeriodDays || 5;

      // Calculate the deadline: dueDate + gracePeriodDays
      const deadline = new Date(payment.dueDate);
      deadline.setDate(deadline.getDate() + gracePeriodDays);

      // Skip if grace period hasn't passed yet
      if (now <= deadline) {
        continue;
      }

      // Check if a LATE_FEE already exists for the same period
      const existingLateFee = await prisma.payment.findFirst({
        where: {
          leaseId: lease.id,
          type: 'LATE_FEE',
          periodStart: payment.periodStart,
          periodEnd: payment.periodEnd,
        },
      });

      if (existingLateFee) {
        continue;
      }

      // Determine the late fee amount from lease or use default
      const lateFeeAmount = lease.lateFee
        ? Number(lease.lateFee)
        : DEFAULT_LATE_FEE;

      await prisma.payment.create({
        data: {
          userId: lease.tenantId,
          leaseId: lease.id,
          type: 'LATE_FEE',
          method: 'OTHER',
          status: 'PENDING',
          amount: lateFeeAmount,
          totalAmount: lateFeeAmount,
          dueDate: now,
          periodStart: payment.periodStart,
          periodEnd: payment.periodEnd,
          notes: `Late fee for rent due ${payment.dueDate.toLocaleDateString()} (grace period: ${gracePeriodDays} days)`,
        },
      });

      appliedCount++;
    }

    return NextResponse.json({
      success: true,
      data: {
        applied: appliedCount,
        totalOverdueChecked: pendingRentPayments.length,
      },
      message: `Applied ${appliedCount} late fee(s)`,
    });
  } catch (error) {
    console.error('Error applying late fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to apply late fees' },
      { status: 500 }
    );
  }
}
