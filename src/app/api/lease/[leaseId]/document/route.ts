import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/lease/[leaseId]/document - Get the uploaded PDF document for a lease
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leaseId: string }> }
) {
  try {
    const { leaseId } = await params;

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
      select: {
        leaseDocumentId: true,
      },
    });

    if (!lease || !lease.leaseDocumentId) {
      return NextResponse.json(
        { success: false, error: 'No document found for this lease' },
        { status: 404 }
      );
    }

    const document = await prisma.document.findUnique({
      where: { id: lease.leaseDocumentId },
      select: {
        fileUrl: true,
        mimeType: true,
        name: true,
      },
    });

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // fileUrl is stored as a data URL: data:application/pdf;base64,...
    const base64Match = document.fileUrl.match(/^data:[^;]+;base64,(.+)$/);
    if (!base64Match) {
      return NextResponse.json(
        { success: false, error: 'Invalid document format' },
        { status: 500 }
      );
    }

    const pdfBuffer = Buffer.from(base64Match[1], 'base64');

    // Check if download is requested
    const isDownload = request.nextUrl.searchParams.get('download') === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${document.name}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error serving document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load document' },
      { status: 500 }
    );
  }
}
