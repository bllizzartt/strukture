import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import {
  createSetupIntent,
  getOrCreateStripeCustomer,
  listPaymentMethods,
} from '@/lib/stripe/server';

// GET /api/tenant/payment-methods - List tenant's saved payment methods
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const paymentMethods = await prisma.storedPaymentMethod.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: paymentMethods,
    });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment methods' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/payment-methods - Create a setup intent for adding a new payment method
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    const stripeCustomer = await getOrCreateStripeCustomer(
      user.id,
      user.email,
      `${user.firstName} ${user.lastName}`,
      user.stripeCustomerId
    );

    // Update user with Stripe customer ID if new
    if (!user.stripeCustomerId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });
    }

    // Create setup intent
    const setupIntent = await createSetupIntent(stripeCustomer.id);

    return NextResponse.json({
      success: true,
      data: {
        clientSecret: setupIntent.client_secret,
      },
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}
