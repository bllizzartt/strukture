import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/viewings - List all viewing requests for landlord's properties
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
    const status = searchParams.get('status');
    const propertyId = searchParams.get('propertyId');

    const viewings = await prisma.viewingRequest.findMany({
      where: {
        property: { ownerId: session.user.id },
        ...(status ? { status: status as any } : {}),
        ...(propertyId ? { propertyId } : {}),
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: viewings,
    });
  } catch (error) {
    console.error('Error fetching viewings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load viewing requests' },
      { status: 500 }
    );
  }
}
