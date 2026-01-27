import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { prisma } from '@/lib/db';
import { createPaymentSchema } from '@/lib/validators/payment';
import { createPaymentIntent, getOrCreateStripeCustomer } from '@/lib/stripe/server';

// GET /api/tenant/payments - List tenant's payments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leaseId = searchParams.get('leaseId');

    const where: any = {
      userId: session.user.id,
    };

    if (status) {
      where.status = status;
    }

    if (leaseId) {
      where.leaseId = leaseId;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/payments - Create a new payment
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
    const result = createPaymentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = result.data;

    // Verify tenant has access to this lease
    const lease = await prisma.lease.findUnique({
      where: { id: data.leaseId },
      include: {
        tenant: true,
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!lease) {
      return NextResponse.json(
        { success: false, error: 'Lease not found' },
        { status: 404 }
      );
    }

    if (lease.tenantId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
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

    // Update user with Stripe customer ID if new
    if (!user.stripeCustomerId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: stripeCustomer.id },
      });
    }

    // Create payment intent
    const paymentIntent = await createPaymentIntent(
      data.amount,
      stripeCustomer.id,
      undefined,
      {
        leaseId: data.leaseId,
        userId: session.user.id,
        type: data.type,
      }
    );

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        leaseId: data.leaseId,
        type: data.type,
        method: data.method,
        status: 'PENDING',
        amount: data.amount,
        totalAmount: data.amount,
        dueDate: new Date(),
        periodStart: data.periodStart ? new Date(data.periodStart) : undefined,
        periodEnd: data.periodEnd ? new Date(data.periodEnd) : undefined,
        notes: data.notes,
        stripePaymentIntentId: paymentIntent.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          payment,
          clientSecret: paymentIntent.client_secret,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
