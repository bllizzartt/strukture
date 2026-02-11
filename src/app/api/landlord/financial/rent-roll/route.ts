import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/financial/rent-roll - Rent roll showing each unit's payment status
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');

    // Parse month (YYYY-MM format) or default to current month
    let year: number;
    let month: number;

    if (monthParam) {
      const match = monthParam.match(/^(\d{4})-(\d{2})$/);
      if (!match) {
        return NextResponse.json(
          { success: false, error: 'Invalid month format. Use YYYY-MM.' },
          { status: 400 }
        );
      }
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10) - 1; // JS months are 0-indexed
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth();
    }

    const periodStart = new Date(year, month, 1);
    const periodEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    // Fetch all units for landlord's properties with active leases and payments
    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      include: {
        units: {
          include: {
            leases: {
              where: {
                status: 'ACTIVE',
              },
              include: {
                tenant: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
                payments: {
                  where: {
                    type: 'RENT',
                    dueDate: {
                      gte: periodStart,
                      lte: periodEnd,
                    },
                    status: {
                      in: ['COMPLETED', 'PENDING', 'PROCESSING'],
                    },
                  },
                  select: {
                    amount: true,
                    status: true,
                    dueDate: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build the rent roll
    const rentRoll = [];

    for (const property of properties) {
      // Sort units by unitNumber
      const sortedUnits = property.units.sort((a, b) =>
        a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })
      );

      for (const unit of sortedUnits) {
        const activeLease = unit.leases[0]; // There should be at most one active lease per unit

        if (!activeLease) {
          // Vacant unit
          rentRoll.push({
            unitNumber: unit.unitNumber,
            propertyName: property.name,
            tenantName: null,
            monthlyRent: Number(unit.monthlyRent),
            paymentStatus: 'VACANT' as const,
            paidAmount: 0,
            dueDate: null,
          });
          continue;
        }

        const monthlyRent = Number(activeLease.monthlyRent);
        const payments = activeLease.payments;

        // Calculate total paid for this period
        const paidAmount = payments
          .filter((p) => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        // Determine payment status
        let paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID';
        if (paidAmount >= monthlyRent) {
          paymentStatus = 'PAID';
        } else if (paidAmount > 0) {
          paymentStatus = 'PARTIAL';
        } else {
          paymentStatus = 'UNPAID';
        }

        // Determine due date (use lease rentDueDay for the given month)
        const dueDate = new Date(year, month, activeLease.rentDueDay);

        rentRoll.push({
          unitNumber: unit.unitNumber,
          propertyName: property.name,
          tenantName: `${activeLease.tenant.firstName} ${activeLease.tenant.lastName}`,
          monthlyRent,
          paymentStatus,
          paidAmount,
          dueDate: dueDate.toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        month: `${year}-${String(month + 1).padStart(2, '0')}`,
        rentRoll,
      },
    });
  } catch (error) {
    console.error('Error fetching rent roll:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rent roll' },
      { status: 500 }
    );
  }
}
