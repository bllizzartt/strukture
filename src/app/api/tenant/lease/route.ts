import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/tenant/lease - Get tenant's active lease
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const lease = await prisma.lease.findFirst({
      where: {
        tenantId: session.user.id,
        status: 'ACTIVE',
      },
      include: {
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
    });

    return NextResponse.json({
      success: true,
      data: lease,
    });
  } catch (error) {
    console.error('Error fetching lease:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lease' },
      { status: 500 }
    );
  }
}
