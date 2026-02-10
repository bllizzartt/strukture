import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe/server';
import { notifyApplicationSubmitted } from '@/lib/notifications';

function generateWireRef(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'STR-';
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

// POST /api/applications/[propertyId]/confirm-payment - Confirm screening fee payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;
    const body = await request.json();
    const { applicationId, method } = body;

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Fetch application with property owner info for notifications
    const application = await prisma.rentalApplication.findFirst({
      where: {
        id: applicationId,
        propertyId,
        status: 'PENDING_PAYMENT',
      },
      include: {
        property: {
          select: {
            name: true,
            addressLine1: true,
            city: true,
            state: true,
            zipCode: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                telegramChatId: true,
              },
            },
          },
        },
        unit: {
          select: { unitNumber: true },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found or not pending payment' },
        { status: 404 }
      );
    }

    if (method === 'WIRE_TRANSFER') {
      // Generate a unique wire reference
      let wireRef = generateWireRef();
      // Ensure uniqueness
      let attempts = 0;
      while (attempts < 5) {
        const existing = await prisma.rentalApplication.findUnique({
          where: { screeningFeeWireRef: wireRef },
        });
        if (!existing) break;
        wireRef = generateWireRef();
        attempts++;
      }

      await prisma.rentalApplication.update({
        where: { id: applicationId },
        data: {
          screeningFeeAmount: 45,
          screeningFeeStatus: 'PENDING',
          screeningFeeMethod: 'WIRE_TRANSFER',
          screeningFeeWireRef: wireRef,
          status: 'PENDING_PAYMENT',
        },
      });

      // Count documents
      const totalDocs = await prisma.document.count({
        where: { applicationId },
      });

      // Notify landlord that application is received with pending wire payment
      try {
        await notifyApplicationSubmitted({
          applicationId,
          applicantName: `${application.firstName} ${application.lastName}`,
          applicantEmail: application.email,
          applicantPhone: application.phone,
          propertyName: application.property.name,
          propertyAddress: `${application.property.addressLine1}, ${application.property.city}, ${application.property.state} ${application.property.zipCode}`,
          unitNumber: application.unit?.unitNumber,
          monthlyIncome: application.monthlyIncome?.toString() || undefined,
          desiredMoveIn: application.desiredMoveIn?.toISOString() || undefined,
          numberOfDocuments: totalDocs,
          landlordId: application.property.owner.id,
          landlordEmail: application.property.owner.email,
          landlordName: `${application.property.owner.firstName} ${application.property.owner.lastName}`,
          landlordTelegramId: application.property.owner.telegramChatId,
        });
      } catch (notifyError) {
        console.error('Failed to send notifications:', notifyError);
      }

      return NextResponse.json({
        success: true,
        data: { wireRef },
        message: 'Wire transfer instructions generated',
      });
    }

    // Card payment - verify with Stripe
    if (!application.screeningFeePaymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'No payment intent found for this application' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.retrieve(
      application.screeningFeePaymentIntentId
    );

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: 'Payment has not been completed' },
        { status: 400 }
      );
    }

    // Payment confirmed - update application status
    await prisma.rentalApplication.update({
      where: { id: applicationId },
      data: {
        screeningFeeStatus: 'PAID',
        status: 'SUBMITTED',
      },
    });

    // Count documents
    const totalDocs = await prisma.document.count({
      where: { applicationId },
    });

    // Send notifications
    try {
      await notifyApplicationSubmitted({
        applicationId,
        applicantName: `${application.firstName} ${application.lastName}`,
        applicantEmail: application.email,
        applicantPhone: application.phone,
        propertyName: application.property.name,
        propertyAddress: `${application.property.addressLine1}, ${application.property.city}, ${application.property.state} ${application.property.zipCode}`,
        unitNumber: application.unit?.unitNumber,
        monthlyIncome: application.monthlyIncome?.toString() || undefined,
        desiredMoveIn: application.desiredMoveIn?.toISOString() || undefined,
        numberOfDocuments: totalDocs,
        landlordId: application.property.owner.id,
        landlordEmail: application.property.owner.email,
        landlordName: `${application.property.owner.firstName} ${application.property.owner.lastName}`,
        landlordTelegramId: application.property.owner.telegramChatId,
      });
    } catch (notifyError) {
      console.error('Failed to send notifications:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed, application submitted',
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
