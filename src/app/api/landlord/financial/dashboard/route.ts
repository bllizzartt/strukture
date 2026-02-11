import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/financial/dashboard - Financial overview for landlord
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
    const period = searchParams.get('period') || 'month';

    if (!['month', 'quarter', 'year'].includes(period)) {
      return NextResponse.json(
        { success: false, error: 'Invalid period. Must be month, quarter, or year.' },
        { status: 400 }
      );
    }

    // Calculate period start date
    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'quarter':
        periodStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Fetch all properties owned by this landlord with their units
    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      include: {
        units: {
          include: {
            leases: {
              where: {
                status: 'ACTIVE',
              },
              select: {
                id: true,
                monthlyRent: true,
              },
            },
          },
        },
      },
    });

    // Collect all property IDs for filtering
    const propertyIds = properties.map((p) => p.id);

    // Total revenue: sum of COMPLETED rent payments in period
    const completedRentPayments = await prisma.payment.aggregate({
      where: {
        type: 'RENT',
        status: 'COMPLETED',
        processedAt: {
          gte: periodStart,
          lte: now,
        },
        lease: {
          unit: {
            property: {
              ownerId: session.user.id,
            },
          },
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = Number(completedRentPayments._sum.amount || 0);

    // Total expected: sum of monthlyRent for all active leases
    let totalExpected = 0;
    const allActiveLeases: { id: string; monthlyRent: number }[] = [];

    for (const property of properties) {
      for (const unit of property.units) {
        for (const lease of unit.leases) {
          const rent = Number(lease.monthlyRent);
          allActiveLeases.push({ id: lease.id, monthlyRent: rent });
          totalExpected += rent;
        }
      }
    }

    // Adjust totalExpected for quarter/year (multiply by number of months in period)
    let monthsInPeriod = 1;
    if (period === 'quarter') {
      monthsInPeriod = 3;
    } else if (period === 'year') {
      monthsInPeriod = 12;
    }
    totalExpected = totalExpected * monthsInPeriod;

    // Collection rate
    const collectionRate = totalExpected > 0
      ? Math.round((totalRevenue / totalExpected) * 10000) / 100
      : 0;

    // Outstanding balance: sum of PENDING payments
    const pendingPayments = await prisma.payment.aggregate({
      where: {
        status: 'PENDING',
        lease: {
          unit: {
            property: {
              ownerId: session.user.id,
            },
          },
        },
      },
      _sum: {
        amount: true,
      },
    });

    const outstandingBalance = Number(pendingPayments._sum.amount || 0);

    // Late fee revenue: sum of COMPLETED LATE_FEE payments in period
    const completedLateFees = await prisma.payment.aggregate({
      where: {
        type: 'LATE_FEE',
        status: 'COMPLETED',
        processedAt: {
          gte: periodStart,
          lte: now,
        },
        lease: {
          unit: {
            property: {
              ownerId: session.user.id,
            },
          },
        },
      },
      _sum: {
        amount: true,
      },
    });

    const lateFeeRevenue = Number(completedLateFees._sum.amount || 0);

    // Maintenance costs: sum of actualCost from completed maintenance requests in period
    const completedMaintenance = await prisma.maintenanceRequest.aggregate({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: periodStart,
          lte: now,
        },
        unit: {
          property: {
            ownerId: session.user.id,
          },
        },
      },
      _sum: {
        actualCost: true,
      },
    });

    const maintenanceCosts = Number(completedMaintenance._sum.actualCost || 0);

    // Occupancy rate: occupied units / total units
    let totalUnits = 0;
    let occupiedUnits = 0;

    for (const property of properties) {
      totalUnits += property.units.length;
      occupiedUnits += property.units.filter((u) => u.status === 'OCCUPIED').length;
    }

    const occupancyRate = totalUnits > 0
      ? Math.round((occupiedUnits / totalUnits) * 10000) / 100
      : 0;

    // Property breakdown
    const propertyBreakdown = await Promise.all(
      properties.map(async (property) => {
        const propertyRevenue = await prisma.payment.aggregate({
          where: {
            type: 'RENT',
            status: 'COMPLETED',
            processedAt: {
              gte: periodStart,
              lte: now,
            },
            lease: {
              unit: {
                propertyId: property.id,
              },
            },
          },
          _sum: {
            amount: true,
          },
        });

        const propTotalUnits = property.units.length;
        const propOccupiedUnits = property.units.filter((u) => u.status === 'OCCUPIED').length;
        const propOccupancy = propTotalUnits > 0
          ? Math.round((propOccupiedUnits / propTotalUnits) * 10000) / 100
          : 0;

        return {
          propertyName: property.name,
          revenue: Number(propertyRevenue._sum.amount || 0),
          units: propTotalUnits,
          occupancy: propOccupancy,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        period,
        periodStart: periodStart.toISOString(),
        totalRevenue,
        totalExpected,
        collectionRate,
        outstandingBalance,
        lateFeeRevenue,
        maintenanceCosts,
        occupancyRate,
        propertyBreakdown,
      },
    });
  } catch (error) {
    console.error('Error fetching financial dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial dashboard' },
      { status: 500 }
    );
  }
}
