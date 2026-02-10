import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// POST /api/landlord/leases/upload-pdf - Upload a PDF and store it as a Document
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Convert file to base64 for storage
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64}`;

    // Create a Document record
    const document = await prisma.document.create({
      data: {
        userId: session.user.id,
        type: 'LEASE',
        name: file.name || 'Lease Document.pdf',
        description: 'Uploaded lease PDF',
        fileUrl: dataUrl,
        fileKey: `lease-pdf-${Date.now()}`,
        fileSize: arrayBuffer.byteLength,
        mimeType: 'application/pdf',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        documentId: document.id,
        fileName: document.name,
        fileSize: document.fileSize,
      },
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to upload PDF: ${message}` },
      { status: 500 }
    );
  }
}
