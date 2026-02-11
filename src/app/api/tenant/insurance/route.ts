import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/tenant/insurance - Get all insurance policies for tenant's active leases
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'TENANT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get all insurance policies for the tenant's active leases
    const policies = await prisma.insurancePolicy.findMany({
      where: {
        tenantId: session.user.id,
        lease: {
          status: 'ACTIVE',
        },
      },
      include: {
        lease: {
          include: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: policies,
    });
  } catch (error) {
    console.error('Error fetching insurance policies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch insurance policies' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/insurance - Create a new insurance policy
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'TENANT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { leaseId, provider, policyNumber, coverageAmount, startDate, endDate, documentUrl } = body;

    if (!leaseId || !provider || !policyNumber || !coverageAmount || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'leaseId, provider, policyNumber, coverageAmount, startDate, and endDate are required' },
        { status: 400 }
      );
    }

    // Verify the lease exists and belongs to this tenant
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (lease.tenantId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const policy = await prisma.insurancePolicy.create({
      data: {
        leaseId,
        tenantId: session.user.id,
        provider,
        policyNumber,
        coverageAmount,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        documentUrl: documentUrl || null,
      },
      include: {
        lease: {
          include: {
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
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: policy,
        message: 'Insurance policy created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating insurance policy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create insurance policy' },
      { status: 500 }
    );
  }
}
