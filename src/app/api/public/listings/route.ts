import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/public/listings - Public property listings (no auth required)
export async function GET(request: NextRequest) {
  try {
    // Fetch all ACTIVE properties that have at least one VACANT unit
    const properties = await prisma.property.findMany({
      where: {
        status: 'ACTIVE',
        units: {
          some: {
            status: 'VACANT',
          },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        city: true,
        state: true,
        amenities: true,
        units: {
          where: {
            status: 'VACANT',
          },
          select: {
            id: true,
            unitNumber: true,
            bedrooms: true,
            bathrooms: true,
            squareFeet: true,
            monthlyRent: true,
            depositAmount: true,
            features: true,
          },
          orderBy: { unitNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform data to ensure no sensitive info leaks
    const listings = properties.map((property) => ({
      id: property.id,
      name: property.name,
      type: property.type,
      address: {
        city: property.city,
        state: property.state,
      },
      amenities: property.amenities,
      vacantUnits: property.units.map((unit) => ({
        id: unit.id,
        unitNumber: unit.unitNumber,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        squareFeet: unit.squareFeet,
        monthlyRent: Number(unit.monthlyRent),
        depositAmount: Number(unit.depositAmount),
        features: unit.features,
      })),
      vacantUnitCount: property.units.length,
    }));

    return NextResponse.json({
      success: true,
      data: listings,
    });
  } catch (error) {
    console.error('Error fetching public listings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
