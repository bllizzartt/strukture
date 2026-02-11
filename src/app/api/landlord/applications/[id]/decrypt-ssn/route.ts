import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

// POST /api/landlord/applications/[id]/decrypt-ssn
// Securely returns the full decrypted SSN for tenant screening purposes.
// Requires authentication, property ownership, and creates an audit log.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const application = await prisma.rentalApplication.findUnique({
      where: { id },
      select: {
        id: true,
        ssnEncrypted: true,
        firstName: true,
        lastName: true,
        property: {
          select: { ownerId: true, name: true },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify ownership — only the property owner or an admin can decrypt
    if (application.property.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (!application.ssnEncrypted) {
      return NextResponse.json(
        { success: false, error: 'No SSN on file for this applicant' },
        { status: 404 }
      );
    }

    // Decrypt the SSN
    const ssnRaw = decrypt(application.ssnEncrypted);

    if (!ssnRaw || ssnRaw.length !== 9) {
      return NextResponse.json(
        { success: false, error: 'Failed to decrypt SSN — data may be corrupted' },
        { status: 500 }
      );
    }

    // Format as XXX-XX-XXXX
    const ssnFormatted = `${ssnRaw.slice(0, 3)}-${ssnRaw.slice(3, 5)}-${ssnRaw.slice(5)}`;

    // Audit log — track every SSN access for compliance
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SSN_VIEWED',
        entityType: 'RentalApplication',
        entityId: id,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    });

    return NextResponse.json(
      { success: true, data: { ssn: ssnFormatted } },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Error decrypting SSN:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve SSN' },
      { status: 500 }
    );
  }
}
