import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/onboarding/available-units - Get all vacant units for tenant selection
export async function GET(request: NextRequest) {
  try {
    const units = await prisma.unit.findMany({
      where: {
        status: 'VACANT',
        property: {
          status: 'ACTIVE',
        },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            state: true,
            zipCode: true,
            type: true,
            amenities: true,
          },
        },
      },
      orderBy: [
        { property: { name: 'asc' } },
        { unitNumber: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: units,
    });
  } catch (error) {
    console.error('Error fetching available units:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch available units' },
      { status: 500 }
    );
  }
}
