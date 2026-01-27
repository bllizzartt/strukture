import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { createPropertySchema } from '@/lib/validators/property';

// GET /api/landlord/properties - List all properties for the landlord
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

    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      include: {
        units: {
          select: {
            id: true,
            unitNumber: true,
            status: true,
            monthlyRent: true,
          },
        },
        _count: {
          select: { units: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: properties,
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

// POST /api/landlord/properties - Create a new property
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
    const result = createPropertySchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const { licenseExpiry, ...propertyData } = result.data;

    const property = await prisma.property.create({
      data: {
        ...propertyData,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : undefined,
        ownerId: session.user.id,
      },
      include: {
        _count: {
          select: { units: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: property,
        message: 'Property created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating property:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create property' },
      { status: 500 }
    );
  }
}
