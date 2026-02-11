import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET - List all vendors for the landlord
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const vendors = await prisma.vendor.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch vendors' }, { status: 500 });
  }
}

// POST - Create a new vendor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, companyName, email, phone, categories, notes } = body;

    if (!name || !email || !categories?.length) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and at least one category are required' },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.create({
      data: {
        ownerId: session.user.id,
        name,
        companyName: companyName || null,
        email,
        phone: phone || null,
        categories,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: vendor }, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json({ success: false, error: 'Failed to create vendor' }, { status: 500 });
  }
}

// PUT - Update a vendor
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, companyName, email, phone, categories, notes, isActive } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Vendor ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.vendor.findFirst({
      where: { id, ownerId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(companyName !== undefined && { companyName }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(categories !== undefined && { categories }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: vendor });
  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json({ success: false, error: 'Failed to update vendor' }, { status: 500 });
  }
}

// DELETE - Delete a vendor
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'LANDLORD' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Vendor ID required' }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.vendor.findFirst({
      where: { id, ownerId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    await prisma.vendor.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete vendor' }, { status: 500 });
  }
}
