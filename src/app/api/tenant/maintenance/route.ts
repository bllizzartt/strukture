import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { createMaintenanceRequestSchema } from '@/lib/validators/maintenance';

// GET /api/tenant/maintenance - List tenant's maintenance requests
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: any = {
      tenantId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        updates: {
          where: { isPublic: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance requests' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/maintenance - Create a new maintenance request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const result = createMaintenanceRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    // Get tenant's active lease to find unit
    const activeLease = await prisma.lease.findFirst({
      where: {
        tenantId: session.user.id,
        status: 'ACTIVE',
      },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!activeLease) {
      return NextResponse.json(
        { success: false, error: 'No active lease found' },
        { status: 400 }
      );
    }

    const data = result.data;

    const maintenanceRequest = await prisma.maintenanceRequest.create({
      data: {
        tenantId: session.user.id,
        unitId: activeLease.unitId,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority,
        entryPermission: data.entryPermission,
        preferredTimes: data.preferredTimes,
        photoUrls: data.photoUrls,
        status: 'SUBMITTED',
      },
      include: {
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                owner: {
                  select: {
                    id: true,
                    telegramChatId: true,
                    telegramNotifications: true,
                    emailNotifications: true,
                    email: true,
                    firstName: true,
                  },
                },
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // TODO: Send notification to landlord (Telegram/Email)

    return NextResponse.json(
      {
        success: true,
        data: maintenanceRequest,
        message: 'Maintenance request submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create maintenance request' },
      { status: 500 }
    );
  }
}
