import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/applications/properties - List all properties accepting applications (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const minBedrooms = searchParams.get('minBedrooms');
    const maxRent = searchParams.get('maxRent');
    const type = searchParams.get('type');

    // Find active properties that have at least one vacant unit
    const properties = await prisma.property.findMany({
      where: {
        status: 'ACTIVE',
        units: {
          some: { status: 'VACANT' },
        },
        ...(city && { city: { contains: city, mode: 'insensitive' as const } }),
        ...(state && { state: { equals: state, mode: 'insensitive' as const } }),
        ...(type && { type: type as any }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        zipCode: true,
        amenities: true,
        yearBuilt: true,
        parkingSpaces: true,
        units: {
          where: { status: 'VACANT' },
          select: {
            id: true,
            unitNumber: true,
            bedrooms: true,
            bathrooms: true,
            squareFeet: true,
            monthlyRent: true,
            depositAmount: true,
            features: true,
            petPolicy: true,
          },
          orderBy: { monthlyRent: 'asc' },
        },
        owner: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Apply client-side filters that require unit-level data
    let filtered = properties;

    if (minBedrooms) {
      const min = parseInt(minBedrooms, 10);
      filtered = filtered.filter((p) =>
        p.units.some((u) => u.bedrooms >= min)
      );
    }

    if (maxRent) {
      const max = parseFloat(maxRent);
      filtered = filtered.filter((p) =>
        p.units.some((u) => parseFloat(u.monthlyRent.toString()) <= max)
      );
    }

    return NextResponse.json({
      success: true,
      data: filtered,
      total: filtered.length,
    });
  } catch (error) {
    console.error('Error fetching available properties:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load available properties' },
      { status: 500 }
    );
  }
}
