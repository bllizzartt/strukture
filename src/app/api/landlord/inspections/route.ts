import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/inspections - Get all inspections for landlord's properties
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
    const leaseId = searchParams.get('leaseId');

    // Build where clause scoped to landlord's properties
    const whereClause: Record<string, unknown> = {
      lease: {
        unit: {
          property: {
            ownerId: session.user.id,
          },
        },
      },
    };

    if (leaseId) {
      whereClause.leaseId = leaseId;
    }

    const inspections = await prisma.inspection.findMany({
      where: whereClause,
      include: {
        items: true,
        lease: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: inspections,
    });
  } catch (error) {
    console.error('Error fetching inspections:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inspections' },
      { status: 500 }
    );
  }
}

// POST /api/landlord/inspections - Create a new inspection
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

    const body = await request.json();
    const { leaseId, type } = body;

    if (!leaseId || !type) {
      return NextResponse.json(
        { success: false, error: 'leaseId and type are required' },
        { status: 400 }
      );
    }

    if (type !== 'MOVE_IN' && type !== 'MOVE_OUT') {
      return NextResponse.json(
        { success: false, error: 'type must be MOVE_IN or MOVE_OUT' },
        { status: 400 }
      );
    }

    // Verify the lease exists and landlord owns it
    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
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
    });

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (
      lease.unit.property.ownerId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Build inspection data
    const inspectionData: Record<string, unknown> = {
      leaseId,
      type,
      status: 'DRAFT',
      inspectedBy: session.user.id,
    };

    // If MOVE_OUT, auto-populate depositHeld from lease.depositAmount
    if (type === 'MOVE_OUT') {
      inspectionData.depositHeld = lease.depositAmount;
    }

    const inspection = await prisma.inspection.create({
      data: inspectionData as any,
      include: {
        items: true,
        lease: {
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
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: inspection,
        message: 'Inspection created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating inspection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create inspection' },
      { status: 500 }
    );
  }
}
