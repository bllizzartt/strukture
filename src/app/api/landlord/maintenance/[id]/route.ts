import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { updateMaintenanceRequestSchema, addMaintenanceUpdateSchema } from '@/lib/validators/maintenance';

interface RouteParams {
  params: { id: string };
}

// GET /api/landlord/maintenance/[id] - Get a specific maintenance request
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
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
                ownerId: true,
              },
            },
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Verify landlord owns this property
    if (
      maintenanceRequest.unit.property.ownerId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: maintenanceRequest,
    });
  } catch (error) {
    console.error('Error fetching maintenance request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance request' },
      { status: 500 }
    );
  }
}

// PUT /api/landlord/maintenance/[id] - Update a maintenance request
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const existingRequest = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    if (
      existingRequest.unit.property.ownerId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = updateMaintenanceRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Track status change for update log
    const statusChanged = data.status && data.status !== existingRequest.status;

    const updateData: any = {};

    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId || null;
    if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate);
    if (data.scheduledTimeSlot) updateData.scheduledTimeSlot = data.scheduledTimeSlot;
    if (data.estimatedCost !== undefined) updateData.estimatedCost = data.estimatedCost;
    if (data.actualCost !== undefined) updateData.actualCost = data.actualCost;
    if (data.vendorName) updateData.vendorName = data.vendorName;
    if (data.vendorPhone) updateData.vendorPhone = data.vendorPhone;
    if (data.resolutionNotes) updateData.resolutionNotes = data.resolutionNotes;

    // Set acknowledgedAt if transitioning to acknowledged
    if (data.status === 'ACKNOWLEDGED' && !existingRequest.acknowledgedAt) {
      updateData.acknowledgedAt = new Date();
    }

    // Set completedAt if transitioning to completed
    if (data.status === 'COMPLETED' && !existingRequest.completedAt) {
      updateData.completedAt = new Date();
    }

    const maintenanceRequest = await prisma.$transaction(async (tx) => {
      // Update the request
      const updated = await tx.maintenanceRequest.update({
        where: { id: params.id },
        data: updateData,
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
      });

      // Create update log if status changed
      if (statusChanged) {
        await tx.maintenanceUpdate.create({
          data: {
            requestId: params.id,
            previousStatus: existingRequest.status,
            newStatus: data.status!,
            message: `Status changed from ${existingRequest.status} to ${data.status}`,
            isPublic: true,
            createdBy: session.user.id,
          },
        });
      }

      return updated;
    });

    // TODO: Send notification to tenant about status update

    return NextResponse.json({
      success: true,
      data: maintenanceRequest,
      message: 'Maintenance request updated successfully',
    });
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance request' },
      { status: 500 }
    );
  }
}

// POST /api/landlord/maintenance/[id] - Add an update/comment
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify ownership
    const existingRequest = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    if (
      existingRequest.unit.property.ownerId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = addMaintenanceUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    const update = await prisma.$transaction(async (tx) => {
      // Create update
      const newUpdate = await tx.maintenanceUpdate.create({
        data: {
          requestId: params.id,
          previousStatus: existingRequest.status,
          newStatus: data.newStatus || existingRequest.status,
          message: data.message,
          isPublic: data.isPublic,
          photoUrls: data.photoUrls,
          createdBy: session.user.id,
        },
      });

      // Update status if provided
      if (data.newStatus && data.newStatus !== existingRequest.status) {
        await tx.maintenanceRequest.update({
          where: { id: params.id },
          data: {
            status: data.newStatus,
            ...(data.newStatus === 'ACKNOWLEDGED' && !existingRequest.acknowledgedAt
              ? { acknowledgedAt: new Date() }
              : {}),
            ...(data.newStatus === 'COMPLETED' && !existingRequest.completedAt
              ? { completedAt: new Date() }
              : {}),
          },
        });
      }

      return newUpdate;
    });

    // TODO: Send notification to tenant

    return NextResponse.json(
      {
        success: true,
        data: update,
        message: 'Update added successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding update:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add update' },
      { status: 500 }
    );
  }
}
