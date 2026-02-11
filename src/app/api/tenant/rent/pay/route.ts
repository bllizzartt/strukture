import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { getOrCreateStripeCustomer, createPaymentIntent } from '@/lib/stripe/server';

// POST /api/tenant/rent/pay - Initiate Stripe payment for a rent/late-fee payment record
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Fetch the payment and verify ownership via lease.tenantId
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        lease: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    if (payment.lease.tenantId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Payment is already ${payment.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // If a PaymentIntent already exists and is still valid, return it
    if (payment.stripePaymentIntentId) {
      const { retrievePaymentIntent } = await import('@/lib/stripe/server');
      const existingIntent = await retrievePaymentIntent(payment.stripePaymentIntentId);

      if (existingIntent.status !== 'canceled' && existingIntent.status !== 'succeeded') {
        return NextResponse.json({
          success: true,
          data: {
            paymentId: payment.id,
            clientSecret: existingIntent.client_secret,
            amount: Number(payment.totalAmount),
          },
        });
      }
    }

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const stripeCustomer = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      `${user.firstName} ${user.lastName}`,
      user.stripeCustomerId
    );

    // Persist the Stripe customer ID if it was newly created
    if (!user.stripeCustomerId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });
    }

    // Create a PaymentIntent
    const paymentIntent = await createPaymentIntent(
      Number(payment.totalAmount),
      stripeCustomer.id,
      undefined,
      {
        paymentId: payment.id,
        leaseId: payment.leaseId,
        userId: session.user.id,
        type: payment.type,
      }
    );

    // Store the PaymentIntent ID on the payment record and mark as PROCESSING
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        status: 'PROCESSING',
        method: 'CREDIT_CARD',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        amount: Number(payment.totalAmount),
      },
    });
  } catch (error) {
    console.error('Error initiating rent payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to initiate payment' },
      { status: 500 }
    );
  }
}
