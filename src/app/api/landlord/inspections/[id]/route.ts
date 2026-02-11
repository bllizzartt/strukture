import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/landlord/inspections/[id] - Get a specific inspection
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const inspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        items: true,
        lease: {
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
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!inspection) {
      return NextResponse.json(
        { success: false, error: 'Inspection not found' },
        { status: 404 }
      );
    }

    // Verify landlord owns this property
    if (
      inspection.lease.unit.property.ownerId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: inspection,
    });
  } catch (error) {
    console.error('Error fetching inspection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch inspection' },
      { status: 500 }
    );
  }
}

// PUT /api/landlord/inspections/[id] - Update an inspection
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify inspection exists and landlord owns it
    const existingInspection = await prisma.inspection.findUnique({
      where: { id },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: {
                  select: {
                    ownerId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!existingInspection) {
      return NextResponse.json(
        { success: false, error: 'Inspection not found' },
        { status: 404 }
      );
    }

    if (
      existingInspection.lease.unit.property.ownerId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, notes, items, deductionNotes, refundAmount } = body;

    const updatedInspection = await prisma.$transaction(async (tx) => {
      // If items provided, delete existing and create new ones
      if (items && Array.isArray(items)) {
        await tx.inspectionItem.deleteMany({
          where: { inspectionId: id },
        });

        await tx.inspectionItem.createMany({
          data: items.map((item: {
            room: string;
            item: string;
            condition: string;
            notes?: string;
            photoUrls?: string[];
            estimatedCost?: number;
          }) => ({
            inspectionId: id,
            room: item.room,
            item: item.item,
            condition: item.condition,
            notes: item.notes || null,
            photoUrls: item.photoUrls || [],
            estimatedCost: item.estimatedCost != null ? item.estimatedCost : null,
          })),
        });
      }

      // Build update data
      const updateData: Record<string, unknown> = {};

      if (notes !== undefined) updateData.notes = notes;
      if (deductionNotes !== undefined) updateData.deductionNotes = deductionNotes;
      if (refundAmount !== undefined) updateData.refundAmount = refundAmount;

      if (status) {
        updateData.status = status;

        // If completing the inspection, calculate deductions and refund
        if (status === 'COMPLETED') {
          updateData.inspectedAt = new Date();

          // Get current items (either newly created or existing)
          const currentItems = await tx.inspectionItem.findMany({
            where: { inspectionId: id },
          });

          // Calculate deductionTotal from sum of items' estimatedCost
          const deductionTotal = currentItems.reduce(
            (sum, item) => {
              if (item.estimatedCost) {
                return sum.add(item.estimatedCost);
              }
              return sum;
            },
            new Decimal(0)
          );

          updateData.deductionTotal = deductionTotal;

          // If MOVE_OUT, calculate refundAmount = depositHeld - deductionTotal
          if (existingInspection.type === 'MOVE_OUT' && existingInspection.depositHeld) {
            updateData.refundAmount = existingInspection.depositHeld.sub(deductionTotal);
          }
        }
      }

      const updated = await tx.inspection.update({
        where: { id },
        data: updateData,
        include: {
          items: true,
          lease: {
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
                    },
                  },
                },
              },
            },
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: updatedInspection,
      message: 'Inspection updated successfully',
    });
  } catch (error) {
    console.error('Error updating inspection:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update inspection' },
      { status: 500 }
    );
  }
}
