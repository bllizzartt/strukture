import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';

// GET /api/tenant/documents - Tenant's document vault
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'TENANT' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch all documents belonging to this tenant
    const documents = await prisma.document.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        type: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group documents by type
    const groupedDocuments: Record<string, typeof documents> = {
      LEASE: [],
      ID_DOCUMENT: [],
      PROOF_OF_INCOME: [],
      INSURANCE: [],
      OTHER: [],
    };

    for (const doc of documents) {
      const category = doc.type in groupedDocuments ? doc.type : 'OTHER';
      groupedDocuments[category].push(doc);
    }

    return NextResponse.json({
      success: true,
      data: {
        documents: groupedDocuments,
        totalCount: documents.length,
      },
    });
  } catch (error) {
    console.error('Error fetching tenant documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}
