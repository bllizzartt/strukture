import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/public/listings/[propertyId] - Single property listing (no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;

    const property = await prisma.property.findUnique({
      where: {
        id: propertyId,
        status: 'ACTIVE',
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
        country: true,
        yearBuilt: true,
        amenities: true,
        logoUrl: true,
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
            petPolicy: true,
          },
          orderBy: { unitNumber: 'asc' },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Transform data - expose full address but no owner info
    const listing = {
      id: property.id,
      name: property.name,
      type: property.type,
      address: {
        line1: property.addressLine1,
        line2: property.addressLine2,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        country: property.country,
      },
      yearBuilt: property.yearBuilt,
      amenities: property.amenities,
      logoUrl: property.logoUrl,
      vacantUnits: property.units.map((unit) => ({
        id: unit.id,
        unitNumber: unit.unitNumber,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        squareFeet: unit.squareFeet,
        monthlyRent: Number(unit.monthlyRent),
        depositAmount: Number(unit.depositAmount),
        features: unit.features,
        petPolicy: unit.petPolicy,
      })),
      vacantUnitCount: property.units.length,
    };

    return NextResponse.json({
      success: true,
      data: listing,
    });
  } catch (error) {
    console.error('Error fetching property listing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch property listing' },
      { status: 500 }
    );
  }
}
