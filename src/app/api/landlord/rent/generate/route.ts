import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// POST /api/landlord/rent/generate - Generate monthly rent payment records for all active leases
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

    // Determine current month boundaries
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month

    // Find all ACTIVE leases where the landlord owns the property
    const activeLeases = await prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        unit: {
          property: {
            ownerId: session.user.id,
          },
        },
      },
      include: {
        payments: {
          where: {
            type: 'RENT',
            periodStart: {
              gte: periodStart,
            },
            periodEnd: {
              lte: new Date(periodEnd.getTime() + 24 * 60 * 60 * 1000), // include end of last day
            },
          },
        },
      },
    });

    let generatedCount = 0;

    for (const lease of activeLeases) {
      // Skip if a RENT payment already exists for this month
      if (lease.payments.length > 0) {
        continue;
      }

      // Determine the due date: use lease.rentDueDay or default to 1st of current month
      const rentDueDay = lease.rentDueDay || 1;
      const dueDate = new Date(now.getFullYear(), now.getMonth(), rentDueDay);

      await prisma.payment.create({
        data: {
          userId: lease.tenantId,
          leaseId: lease.id,
          type: 'RENT',
          method: 'OTHER',
          status: 'PENDING',
          amount: lease.monthlyRent,
          totalAmount: lease.monthlyRent,
          dueDate,
          periodStart,
          periodEnd,
        },
      });

      generatedCount++;
    }

    return NextResponse.json({
      success: true,
      data: {
        generated: generatedCount,
        totalActiveLeases: activeLeases.length,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
      },
      message: `Generated ${generatedCount} rent invoice(s) for ${periodStart.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
    });
  } catch (error) {
    console.error('Error generating rent invoices:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate rent invoices' },
      { status: 500 }
    );
  }
}
