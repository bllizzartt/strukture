import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { sendApplicationApprovedEmail, sendApplicationDeniedEmail } from '@/lib/email';

// GET /api/landlord/applications/[id] - Get application details
export async function GET(
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
      include: {
        property: {
          select: { id: true, name: true, ownerId: true },
        },
        unit: {
          select: { id: true, unitNumber: true, monthlyRent: true },
        },
        documents: {
          select: {
            id: true,
            type: true,
            name: true,
            mimeType: true,
            fileSize: true,
            createdAt: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (application.property.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load application' },
      { status: 500 }
    );
  }
}

// PATCH /api/landlord/applications/[id] - Update application status
export async function PATCH(
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
    const body = await request.json();
    const { status, reviewNotes } = body;

    if (!status || !['UNDER_REVIEW', 'APPROVED', 'DENIED', 'WITHDRAWN'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

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

    // Fetch full application data including property address for emails
    const fullApplication = await prisma.rentalApplication.findUnique({
      where: { id },
      include: {
        property: {
          select: {
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            zipCode: true,
            owner: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        unit: {
          select: { unitNumber: true },
        },
      },
    });

    const updated = await prisma.rentalApplication.update({
      where: { id },
      data: {
        status,
        reviewNotes: reviewNotes || application.reviewNotes,
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `APPLICATION_${status}`,
        entityType: 'RentalApplication',
        entityId: id,
        previousValues: { status: application.status },
        newValues: { status },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    });

    // Send email notification to applicant on approval or denial
    if (fullApplication && (status === 'APPROVED' || status === 'DENIED')) {
      const propertyAddress = `${fullApplication.property.addressLine1}, ${fullApplication.property.city}, ${fullApplication.property.state} ${fullApplication.property.zipCode}`;
      const landlordName = `${fullApplication.property.owner.firstName} ${fullApplication.property.owner.lastName}`;

      const emailData = {
        applicantName: `${fullApplication.firstName} ${fullApplication.lastName}`,
        propertyName: fullApplication.property.name,
        propertyAddress,
        unitNumber: fullApplication.unit?.unitNumber,
        landlordName,
      };

      const emailResult = status === 'APPROVED'
        ? await sendApplicationApprovedEmail(fullApplication.email, emailData)
        : await sendApplicationDeniedEmail(fullApplication.email, emailData);

      if (!emailResult.success) {
        console.error(`Failed to send ${status} email to ${fullApplication.email}:`, emailResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
