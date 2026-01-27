import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { updatePropertySchema } from '@/lib/validators/property';

interface RouteParams {
  params: { id: string };
}

// GET /api/landlord/properties/[id] - Get property details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        units: {
          orderBy: { unitNumber: 'asc' },
        },
        _count: {
          select: { units: true },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (property.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: property,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch property' },
      { status: 500 }
    );
  }
}

// PUT /api/landlord/properties/[id] - Update property
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check ownership
    const existingProperty = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!existingProperty) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    if (existingProperty.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = updatePropertySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { licenseExpiry, ...propertyData } = result.data;

    const property = await prisma.property.update({
      where: { id: params.id },
      data: {
        ...propertyData,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
      },
      include: {
        units: true,
        _count: {
          select: { units: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: property,
      message: 'Property updated successfully',
    });
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update property' },
      { status: 500 }
    );
  }
}

// DELETE /api/landlord/properties/[id] - Delete property
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check ownership
    const existingProperty = await prisma.property.findUnique({
      where: { id: params.id },
      include: {
        units: {
          include: {
            leases: {
              where: {
                status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] },
              },
            },
          },
        },
      },
    });

    if (!existingProperty) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    if (existingProperty.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check for active leases
    const hasActiveLeases = existingProperty.units.some(
      (unit) => unit.leases.length > 0
    );

    if (hasActiveLeases) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete property with active leases. Please terminate all leases first.',
        },
        { status: 400 }
      );
    }

    // Delete property (cascade will delete units)
    await prisma.property.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Property deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting property:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete property' },
      { status: 500 }
    );
  }
}
