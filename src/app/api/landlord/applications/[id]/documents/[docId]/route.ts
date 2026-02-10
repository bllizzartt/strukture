import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/landlord/applications/[id]/documents/[docId] - Serve application document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, docId } = await params;

    // Verify application belongs to landlord's property
    const application = await prisma.rentalApplication.findUnique({
      where: { id },
      include: {
        property: { select: { ownerId: true } },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    if (application.property.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: docId, applicationId: id },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Parse data URL
    const base64Match = document.fileUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { success: false, error: 'Invalid document format' },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(base64Match[1], 'base64');
    const isDownload = request.nextUrl.searchParams.get('download') === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': document.mimeType,
        'Content-Disposition': `${disposition}; filename="${document.name}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving application document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load document' },
      { status: 500 }
    );
  }
}
