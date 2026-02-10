import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// DELETE /api/landlord/viewings/slots/[id] - Remove a viewing slot
export async function DELETE(
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

    // Verify slot belongs to landlord's property
    const slot = await prisma.viewingSlot.findFirst({
      where: {
        id,
        property: { ownerId: session.user.id },
      },
      include: { _count: { select: { bookings: true } } },
    });

    if (!slot) {
      return NextResponse.json(
        { success: false, error: 'Viewing slot not found' },
        { status: 404 }
      );
    }

    // If slot has bookings, deactivate instead of deleting
    if (slot._count.bookings > 0) {
      await prisma.viewingSlot.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: 'Slot deactivated (has existing bookings)',
      });
    }

    await prisma.viewingSlot.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Slot deleted' });
  } catch (error) {
    console.error('Error deleting viewing slot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete viewing slot' },
      { status: 500 }
    );
  }
}

// PUT /api/landlord/viewings/slots/[id] - Toggle slot active state
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
    const body = await request.json();

    const slot = await prisma.viewingSlot.findFirst({
      where: {
        id,
        property: { ownerId: session.user.id },
      },
    });

    if (!slot) {
      return NextResponse.json(
        { success: false, error: 'Viewing slot not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.viewingSlot.update({
      where: { id },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.startTime ? { startTime: new Date(body.startTime) } : {}),
        ...(body.endTime ? { endTime: new Date(body.endTime) } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating viewing slot:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update viewing slot' },
      { status: 500 }
    );
  }
}
