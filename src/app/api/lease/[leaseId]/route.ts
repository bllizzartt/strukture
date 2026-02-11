import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/lease/[leaseId] - Get lease details for signing (public, no auth required)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            dateOfBirth: true,
            status: true,
          },
        },
        unit: {
          include: {
            property: {
              select: {
                name: true,
                addressLine1: true,
                addressLine2: true,
                city: true,
                state: true,
                zipCode: true,
                owner: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        template: {
          select: {
            id: true,
            name: true,
            content: true,
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

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
