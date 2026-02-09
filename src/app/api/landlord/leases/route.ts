import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/leases - Get all leases for landlord's properties
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');

    // Get all properties owned by this landlord
    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    const propertyIds = properties.map((p) => p.id);

    // Build filters
    const whereClause: Record<string, unknown> = {
      unit: {
        propertyId: propertyId
          ? { equals: propertyId }
          : { in: propertyIds },
      },
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const leases = await prisma.lease.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
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
      orderBy: [{ status: 'asc' }, { endDate: 'desc' }],
    });

    // Summary stats
    const totalLeases = leases.length;
    const activeLeases = leases.filter((l) => l.status === 'ACTIVE').length;
    const expiringLeases = leases.filter((l) => {
      if (l.status !== 'ACTIVE') return false;
      const daysUntilExpiry = Math.ceil(
        (new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 60;
    }).length;
    const pendingLeases = leases.filter((l) => l.status === 'PENDING_SIGNATURE' || l.status === 'DRAFT').length;

    return NextResponse.json({
      success: true,
      data: {
        leases,
        summary: {
          total: totalLeases,
          active: activeLeases,
          expiring: expiringLeases,
          pending: pendingLeases,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching leases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch leases' },
      { status: 500 }
    );
  }
}
