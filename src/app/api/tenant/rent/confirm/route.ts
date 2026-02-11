import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { retrievePaymentIntent } from '@/lib/stripe/server';

// POST /api/tenant/rent/confirm - Confirm a rent payment after Stripe succeeds
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { paymentId, paymentIntentId } = body;

    if (!paymentId || !paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID and Payment Intent ID are required' },
        { status: 400 }
      );
    }

    // Fetch the payment record
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

    // Verify the caller owns this payment via the lease tenant
    if (payment.lease.tenantId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Verify the PaymentIntent ID matches the one stored on the payment
    if (payment.stripePaymentIntentId !== paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'Payment intent mismatch' },
        { status: 400 }
      );
    }

    if (payment.status === 'COMPLETED') {
      return NextResponse.json({
        success: true,
        message: 'Payment already confirmed',
      });
    }

    // Verify the PaymentIntent status with Stripe
    const paymentIntent = await retrievePaymentIntent(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: `Payment has not succeeded. Current status: ${paymentIntent.status}` },
        { status: 400 }
      );
    }

    // Update the payment record to COMPLETED
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        processedAt: new Date(),
        stripeChargeId: typeof paymentIntent.latest_charge === 'string'
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedPayment,
      message: 'Payment confirmed successfully',
    });
  } catch (error) {
    console.error('Error confirming rent payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
