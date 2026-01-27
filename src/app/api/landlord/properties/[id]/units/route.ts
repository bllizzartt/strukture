import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { createUnitSchema } from '@/lib/validators/property';

interface RouteParams {
  params: { id: string };
}

// GET /api/landlord/properties/[id]/units - List all units for a property
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    if (property.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const units = await prisma.unit.findMany({
      where: { propertyId: params.id },
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          include: {
            tenant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { unitNumber: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error('Error fetching units:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch units' },
      { status: 500 }
    );
  }
}

// POST /api/landlord/properties/[id]/units - Create a new unit
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify property ownership
    const property = await prisma.property.findUnique({
      where: { id: params.id },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    if (property.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const result = createUnitSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Check for duplicate unit number
    const existingUnit = await prisma.unit.findUnique({
      where: {
        propertyId_unitNumber: {
          propertyId: params.id,
          unitNumber: result.data.unitNumber,
        },
      },
    });

    if (existingUnit) {
      return NextResponse.json(
        { success: false, error: 'A unit with this number already exists' },
        { status: 409 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        ...result.data,
        propertyId: params.id,
      },
    });

    // Update property total units count
    await prisma.property.update({
      where: { id: params.id },
      data: {
        totalUnits: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: unit,
        message: 'Unit created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating unit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create unit' },
      { status: 500 }
    );
  }
}
