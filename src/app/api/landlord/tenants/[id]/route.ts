import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/tenants/[id] - Get a specific tenant's details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get landlord's properties
    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    const propertyIds = properties.map((p) => p.id);

    // Get the tenant with all their leases for the landlord's properties
    const tenant = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emergencyContactRelation: true,
        createdAt: true,
        tenantLeases: {
          where: {
            unit: {
              propertyId: { in: propertyIds },
            },
          },
          include: {
            unit: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                    addressLine1: true,
                    city: true,
                    state: true,
                    zipCode: true,
                  },
                },
              },
            },
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: {
                id: true,
                type: true,
                method: true,
                status: true,
                amount: true,
                totalAmount: true,
                dueDate: true,
                createdAt: true,
                processedAt: true,
              },
            },
          },
          orderBy: { startDate: 'desc' },
        },
        maintenanceRequests: {
          where: {
            unit: {
              propertyId: { in: propertyIds },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
            completedAt: true,
          },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify the tenant has at least one lease with this landlord's properties
    if (tenant.tenantLeases.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Calculate payment summary
    const allPayments = tenant.tenantLeases.flatMap((l) => l.payments);
    const totalPaid = allPayments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.totalAmount), 0);

    const pendingPayments = allPayments.filter((p) => p.status === 'PENDING').length;
    const latePayments = allPayments.filter((p) => {
      if (p.status !== 'PENDING') return false;
      return new Date(p.dueDate) < new Date();
    }).length;

    // Get active lease
    const activeLease = tenant.tenantLeases.find((l) => l.status === 'ACTIVE');

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          firstName: tenant.firstName,
          lastName: tenant.lastName,
          email: tenant.email,
          phone: tenant.phone,
          dateOfBirth: tenant.dateOfBirth,
          emergencyContact: tenant.emergencyContactName
            ? {
                name: tenant.emergencyContactName,
                phone: tenant.emergencyContactPhone,
                relation: tenant.emergencyContactRelation,
              }
            : null,
          createdAt: tenant.createdAt,
        },
        leases: tenant.tenantLeases,
        activeLease,
        maintenanceRequests: tenant.maintenanceRequests,
        paymentSummary: {
          totalPaid,
          pendingPayments,
          latePayments,
          recentPayments: allPayments.slice(0, 5),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching tenant:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
}

// DELETE /api/landlord/tenants/[id] - Remove tenant by deleting their inactive leases
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get landlord's properties
    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    const propertyIds = properties.map((p) => p.id);

    // Check if tenant has any active leases with this landlord
    const activeLeases = await prisma.lease.findMany({
      where: {
        tenantId: id,
        status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] },
        unit: {
          propertyId: { in: propertyIds },
        },
      },
    });

    if (activeLeases.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove a tenant with active leases. Terminate the lease first.' },
        { status: 400 }
      );
    }

    // Delete all inactive leases for this tenant at this landlord's properties
    const result = await prisma.lease.deleteMany({
      where: {
        tenantId: id,
        status: { in: ['TERMINATED', 'EXPIRED', 'DRAFT'] },
        unit: {
          propertyId: { in: propertyIds },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tenant removed. ${result.count} lease record${result.count !== 1 ? 's' : ''} deleted.`,
    });
  } catch (error) {
    console.error('Error removing tenant:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove tenant' },
      { status: 500 }
    );
  }
}
