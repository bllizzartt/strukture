import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/tenants - Get all tenants for landlord's properties
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
    const leaseStatus = searchParams.get('leaseStatus');

    // Get all properties owned by this landlord
    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    const propertyIds = properties.map((p) => p.id);

    // Build filters
    const whereClause: any = {
      unit: {
        propertyId: propertyId
          ? { equals: propertyId }
          : { in: propertyIds },
      },
    };

    if (leaseStatus) {
      whereClause.status = leaseStatus;
    }

    // Get all leases (active and expired) with tenant and unit info
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
            createdAt: true,
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
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { endDate: 'desc' }],
    });

    // Transform data to group by tenant
    const tenantMap = new Map<
      string,
      {
        tenant: any;
        leases: any[];
        activeLease: any | null;
        totalPaid: number;
        lastPayment: any | null;
      }
    >();

    for (const lease of leases) {
      const tenantId = lease.tenant.id;

      if (!tenantMap.has(tenantId)) {
        tenantMap.set(tenantId, {
          tenant: lease.tenant,
          leases: [],
          activeLease: null,
          totalPaid: 0,
          lastPayment: null,
        });
      }

      const tenantData = tenantMap.get(tenantId)!;
      tenantData.leases.push({
        id: lease.id,
        status: lease.status,
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRent: lease.monthlyRent,
        unit: lease.unit,
      });

      if (lease.status === 'ACTIVE' && !tenantData.activeLease) {
        tenantData.activeLease = {
          id: lease.id,
          status: lease.status,
          startDate: lease.startDate,
          endDate: lease.endDate,
          monthlyRent: lease.monthlyRent,
          unit: lease.unit,
        };
      }

      if (lease.payments[0] && !tenantData.lastPayment) {
        tenantData.lastPayment = lease.payments[0];
      }
    }

    const tenants = Array.from(tenantMap.values());

    // Get summary stats
    const activeTenants = tenants.filter((t) => t.activeLease).length;
    const expiringLeases = leases.filter((l) => {
      if (l.status !== 'ACTIVE') return false;
      const daysUntilExpiry = Math.ceil(
        (new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 60;
    }).length;

    return NextResponse.json({
      success: true,
      data: {
        tenants,
        summary: {
          total: tenants.length,
          active: activeTenants,
          expiringLeases,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tenants:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
}
