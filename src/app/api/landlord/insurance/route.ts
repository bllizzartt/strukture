import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/insurance - Get all insurance policies for tenants in landlord's properties
export async function GET() {
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

    // Get all insurance policies for tenants in landlord's properties
    const policies = await prisma.insurancePolicy.findMany({
      where: {
        lease: {
          unit: {
            property: {
              ownerId: session.user.id,
            },
          },
        },
      },
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

// PUT /api/landlord/insurance - Verify/unverify an insurance policy
export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, isVerified } = body;

    if (!id || typeof isVerified !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'id and isVerified (boolean) are required' },
        { status: 400 }
      );
    }

    // Find the policy and verify landlord owns the related property
    const policy = await prisma.insurancePolicy.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: {
                  select: {
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!policy) {
      return NextResponse.json(
        { success: false, error: 'Insurance policy not found' },
        { status: 404 }
      );
    }

    if (
      policy.lease.unit.property.ownerId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const updatedPolicy = await prisma.insurancePolicy.update({
      where: { id },
      data: {
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
      },
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

    return NextResponse.json({
      success: true,
      data: updatedPolicy,
      message: isVerified
        ? 'Insurance policy verified successfully'
        : 'Insurance policy verification removed',
    });
  } catch (error) {
    console.error('Error updating insurance policy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update insurance policy' },
      { status: 500 }
    );
  }
}
