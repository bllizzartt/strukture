import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/viewings/slots - List viewing slots for landlord's properties
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
    const propertyId = searchParams.get('propertyId');

    const slots = await prisma.viewingSlot.findMany({
      where: {
        property: { ownerId: session.user.id },
        ...(propertyId ? { propertyId } : {}),
      },
      include: {
        property: {
          select: { id: true, name: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ success: true, data: slots });
  } catch (error) {
    console.error('Error fetching viewing slots:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load viewing slots' },
      { status: 500 }
    );
  }
}

// POST /api/landlord/viewings/slots - Create viewing slots
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
    const { propertyId, slots } = body;

    if (!propertyId || !slots || !Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Property ID and at least one slot are required' },
        { status: 400 }
      );
    }

    // Verify property belongs to landlord
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId: session.user.id },
    });

    if (!property) {
      return NextResponse.json(
        { success: false, error: 'Property not found' },
        { status: 404 }
      );
    }

    // Validate and create slots
    const slotData = slots.map((slot: { startTime: string; endTime: string }) => {
      const start = new Date(slot.startTime);
      const end = new Date(slot.endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }

      if (end <= start) {
        throw new Error('End time must be after start time');
      }

      return {
        propertyId,
        startTime: start,
        endTime: end,
      };
    });

    const created = await prisma.viewingSlot.createMany({
      data: slotData,
    });

    return NextResponse.json(
      { success: true, message: `${created.count} slot(s) created` },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating viewing slots:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create viewing slots' },
      { status: 400 }
    );
  }
}
