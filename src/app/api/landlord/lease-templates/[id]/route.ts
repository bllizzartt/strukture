import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/lease-templates/[id] - Get a single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const template = await prisma.leaseTemplate.findFirst({
      where: { id, ownerId: session.user.id },
    });

    if (!template) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ success: false, error: 'Failed to load template' }, { status: 500 });
  }
}

// PUT /api/landlord/lease-templates/[id] - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, content, isActive } = body;

    const existing = await prisma.leaseTemplate.findFirst({
      where: { id, ownerId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    const updated = await prisma.leaseTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ success: false, error: 'Failed to update template' }, { status: 500 });
  }
}

// DELETE /api/landlord/lease-templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.leaseTemplate.findFirst({
      where: { id, ownerId: session.user.id },
      include: { _count: { select: { leases: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Template not found' }, { status: 404 });
    }

    if (existing._count.leases > 0) {
      // Deactivate instead of delete if leases reference it
      await prisma.leaseTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, message: 'Template deactivated (has linked leases)' });
    }

    await prisma.leaseTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete template' }, { status: 500 });
  }
}
