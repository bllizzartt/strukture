import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/viewings/[id] - Get a single viewing request
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const viewing = await prisma.viewingRequest.findFirst({
      where: {
        id,
        property: { ownerId: session.user.id },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    if (!viewing) {
      return NextResponse.json(
        { success: false, error: 'Viewing request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: viewing });
  } catch (error) {
    console.error('Error fetching viewing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load viewing request' },
      { status: 500 }
    );
  }
}

// PUT /api/landlord/viewings/[id] - Update viewing request (confirm, reschedule, cancel, complete)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify the viewing belongs to landlord's property
    const existing = await prisma.viewingRequest.findFirst({
      where: {
        id,
        property: { ownerId: session.user.id },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Viewing request not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, confirmedDate, landlordNotes } = body;

    // Validate status transition
    const validStatuses = ['REQUESTED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (confirmedDate) updateData.confirmedDate = new Date(confirmedDate);
    if (landlordNotes !== undefined) updateData.landlordNotes = landlordNotes;

    // If confirming, require a confirmed date
    if (status === 'CONFIRMED' && !confirmedDate && !existing.confirmedDate) {
      return NextResponse.json(
        { success: false, error: 'A confirmed date is required when confirming a viewing' },
        { status: 400 }
      );
    }

    const updated = await prisma.viewingRequest.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: {
            id: true,
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating viewing:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update viewing request' },
      { status: 500 }
    );
  }
}
