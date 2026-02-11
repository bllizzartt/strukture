import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/lease-templates - List landlord's lease templates
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.leaseTemplate.findMany({
      where: { ownerId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { leases: true } },
      },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('Error fetching lease templates:', error);
    return NextResponse.json({ success: false, error: 'Failed to load templates' }, { status: 500 });
  }
}

// POST /api/landlord/lease-templates - Create a new lease template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, content } = body;

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: 'Template name and content are required' },
        { status: 400 }
      );
    }

    const template = await prisma.leaseTemplate.create({
      data: {
        ownerId: session.user.id,
        name,
        description: description || null,
        content,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error('Error creating lease template:', error);
    return NextResponse.json({ success: false, error: 'Failed to create template' }, { status: 500 });
  }
}
