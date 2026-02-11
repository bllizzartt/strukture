import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/leases/expiring - Get leases expiring within N days
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
        { success: false, error: 'Forbidden - landlord or admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '90', 10);

    if (isNaN(days) || days < 1) {
      return NextResponse.json(
        { success: false, error: 'days must be a positive integer' },
        { status: 400 }
      );
    }

    // Calculate the cutoff date
    const now = new Date();
    const cutoffDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Get all properties owned by this landlord
    const properties = await prisma.property.findMany({
      where: { ownerId: session.user.id },
      select: { id: true },
    });

    const propertyIds = properties.map((p) => p.id);

    // Get active leases expiring within the cutoff
    const leases = await prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          gte: now,
          lte: cutoffDate,
        },
        unit: {
          propertyId: { in: propertyIds },
        },
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        unit: {
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
        },
      },
      orderBy: { endDate: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        leases,
        total: leases.length,
        days,
      },
    });
  } catch (error) {
    console.error('Error fetching expiring leases:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch expiring leases' },
      { status: 500 }
    );
  }
}
