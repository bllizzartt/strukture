import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

interface RouteParams {
  params: { id: string };
}

// GET /api/tenant/maintenance/[id] - Get a specific maintenance request for tenant
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const maintenanceRequest = await prisma.maintenanceRequest.findUnique({
      where: { id: params.id },
      include: {
        unit: {
          select: {
            unitNumber: true,
            property: {
              select: {
                name: true,
              },
            },
          },
        },
        updates: {
          where: {
            isPublic: true,
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            message: true,
            createdAt: true,
            previousStatus: true,
            newStatus: true,
            isPublic: true,
          },
        },
      },
    });

    if (!maintenanceRequest) {
      return NextResponse.json(
        { success: false, error: 'Maintenance request not found' },
        { status: 404 }
      );
    }

    // Verify this request belongs to the tenant
    if (maintenanceRequest.tenantId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: maintenanceRequest,
    });
  } catch (error) {
    console.error('Error fetching maintenance request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch maintenance request' },
      { status: 500 }
    );
  }
}
