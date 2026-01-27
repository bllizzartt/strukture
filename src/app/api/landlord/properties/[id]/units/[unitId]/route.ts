import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { updateUnitSchema } from '@/lib/validators/property';

interface RouteParams {
  params: { id: string; unitId: string };
}

// Helper to verify ownership
async function verifyOwnership(propertyId: string, userId: string, role: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) {
    return { error: 'Property not found', status: 404 };
  }

  if (property.ownerId !== userId && role !== 'ADMIN') {
    return { error: 'Forbidden', status: 403 };
  }

  return { property };
}

// GET /api/landlord/properties/[id]/units/[unitId] - Get unit details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const ownership = await verifyOwnership(params.id, session.user.id, session.user.role);
    if ('error' in ownership) {
      return NextResponse.json(
        { success: false, error: ownership.error },
        { status: ownership.status }
      );
    }

    const unit = await prisma.unit.findUnique({
      where: { id: params.unitId },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
          },
        },
        leases: {
          orderBy: { createdAt: 'desc' },
          take: 5,
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
          },
        },
        maintenanceRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!unit) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      );
    }

    if (unit.propertyId !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Unit does not belong to this property' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: unit,
    });
  } catch (error) {
    console.error('Error fetching unit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch unit' },
      { status: 500 }
    );
  }
}

// PUT /api/landlord/properties/[id]/units/[unitId] - Update unit
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const ownership = await verifyOwnership(params.id, session.user.id, session.user.role);
    if ('error' in ownership) {
      return NextResponse.json(
        { success: false, error: ownership.error },
        { status: ownership.status }
      );
    }

    const existingUnit = await prisma.unit.findUnique({
      where: { id: params.unitId },
    });

    if (!existingUnit) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      );
    }

    if (existingUnit.propertyId !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Unit does not belong to this property' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = updateUnitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Check for duplicate unit number if changing
    if (result.data.unitNumber && result.data.unitNumber !== existingUnit.unitNumber) {
      const duplicateUnit = await prisma.unit.findUnique({
        where: {
          propertyId_unitNumber: {
            propertyId: params.id,
            unitNumber: result.data.unitNumber,
          },
        },
      });

      if (duplicateUnit) {
        return NextResponse.json(
          { success: false, error: 'A unit with this number already exists' },
          { status: 409 }
        );
      }
    }

    const unit = await prisma.unit.update({
      where: { id: params.unitId },
      data: result.data,
    });

    return NextResponse.json({
      success: true,
      data: unit,
      message: 'Unit updated successfully',
    });
  } catch (error) {
    console.error('Error updating unit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update unit' },
      { status: 500 }
    );
  }
}

// DELETE /api/landlord/properties/[id]/units/[unitId] - Delete unit
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const ownership = await verifyOwnership(params.id, session.user.id, session.user.role);
    if ('error' in ownership) {
      return NextResponse.json(
        { success: false, error: ownership.error },
        { status: ownership.status }
      );
    }

    const existingUnit = await prisma.unit.findUnique({
      where: { id: params.unitId },
      include: {
        leases: {
          where: {
            status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] },
          },
        },
      },
    });

    if (!existingUnit) {
      return NextResponse.json(
        { success: false, error: 'Unit not found' },
        { status: 404 }
      );
    }

    if (existingUnit.propertyId !== params.id) {
      return NextResponse.json(
        { success: false, error: 'Unit does not belong to this property' },
        { status: 400 }
      );
    }

    // Check for active leases
    if (existingUnit.leases.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete unit with active leases. Please terminate the lease first.',
        },
        { status: 400 }
      );
    }

    await prisma.unit.delete({
      where: { id: params.unitId },
    });

    // Update property total units count
    await prisma.property.update({
      where: { id: params.id },
      data: {
        totalUnits: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Unit deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting unit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete unit' },
      { status: 500 }
    );
  }
}
