import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStripe } from '@/lib/stripe/server';

const SCREENING_FEE_AMOUNT = 45; // $45.00

// POST /api/applications/[propertyId]/screening-fee - Create a PaymentIntent for screening fee
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const { propertyId } = await params;
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json(
        { success: false, error: 'Application ID is required' },
        { status: 400 }
      );
    }

    // Verify application exists, belongs to this property, and is pending payment
    const application = await prisma.rentalApplication.findFirst({
      where: {
        id: applicationId,
        propertyId,
        status: 'PENDING_PAYMENT',
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found or not pending payment' },
        { status: 404 }
      );
    }

    // If there's already a PaymentIntent, return it
    if (application.screeningFeePaymentIntentId) {
      const stripe = getStripe();
      const existingIntent = await stripe.paymentIntents.retrieve(
        application.screeningFeePaymentIntentId
      );

      if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
        return NextResponse.json({
          success: true,
          data: {
            clientSecret: existingIntent.client_secret,
            amount: SCREENING_FEE_AMOUNT,
          },
        });
      }
    }

    // Create a new PaymentIntent
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(SCREENING_FEE_AMOUNT * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: 'screening_fee',
        applicationId,
        propertyId,
        applicantName: `${application.firstName} ${application.lastName}`,
        applicantEmail: application.email,
      },
    });

    // Store PaymentIntent ID on the application
    await prisma.rentalApplication.update({
      where: { id: applicationId },
      data: {
        screeningFeeAmount: SCREENING_FEE_AMOUNT,
        screeningFeeStatus: 'PENDING',
        screeningFeeMethod: 'CARD',
        screeningFeePaymentIntentId: paymentIntent.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        amount: SCREENING_FEE_AMOUNT,
      },
    });
  } catch (error) {
    console.error('Error creating screening fee payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
