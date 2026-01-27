import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return stripeInstance;
}

// For backwards compatibility
export const stripe = {
  get customers() {
    return getStripe().customers;
  },
  get paymentIntents() {
    return getStripe().paymentIntents;
  },
  get setupIntents() {
    return getStripe().setupIntents;
  },
  get paymentMethods() {
    return getStripe().paymentMethods;
  },
  get refunds() {
    return getStripe().refunds;
  },
};

/**
 * Create a Stripe customer for a user
 */
export async function createStripeCustomer(email: string, name: string, metadata?: Record<string, string>) {
  return stripe.customers.create({
    email,
    name,
    metadata,
  });
}

/**
 * Get or create a Stripe customer
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name: string,
  existingCustomerId?: string | null
) {
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId);
      if (!customer.deleted) {
        return customer;
      }
    } catch {
      // Customer doesn't exist, create new one
    }
  }

  return createStripeCustomer(email, name, { userId });
}

/**
 * Create a payment intent for a one-time payment
 */
export async function createPaymentIntent(
  amount: number,
  customerId: string,
  paymentMethodId?: string,
  metadata?: Record<string, string>
) {
  const params: Stripe.PaymentIntentCreateParams = {
    amount: Math.round(amount * 100), // Convert to cents
    currency: 'usd',
    customer: customerId,
    metadata,
    automatic_payment_methods: {
      enabled: true,
    },
  };

  if (paymentMethodId) {
    params.payment_method = paymentMethodId;
    params.confirm = true;
    params.return_url = `${process.env.NEXTAUTH_URL}/tenant/payments/confirm`;
  }

  return stripe.paymentIntents.create(params);
}

/**
 * Create a setup intent for saving a payment method
 */
export async function createSetupIntent(customerId: string) {
  return stripe.setupIntents.create({
    customer: customerId,
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

/**
 * Attach a payment method to a customer
 */
export async function attachPaymentMethod(paymentMethodId: string, customerId: string) {
  return stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
}

/**
 * Set a default payment method for a customer
 */
export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string) {
  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

/**
 * List payment methods for a customer
 */
export async function listPaymentMethods(customerId: string, type: Stripe.PaymentMethodListParams.Type = 'card') {
  return stripe.paymentMethods.list({
    customer: customerId,
    type,
  });
}

/**
 * Detach a payment method from a customer
 */
export async function detachPaymentMethod(paymentMethodId: string) {
  return stripe.paymentMethods.detach(paymentMethodId);
}

/**
 * Refund a payment
 */
export async function refundPayment(paymentIntentId: string, amount?: number) {
  const params: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amount) {
    params.amount = Math.round(amount * 100);
  }

  return stripe.refunds.create(params);
}

/**
 * Retrieve a payment intent
 */
export async function retrievePaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Cancel a payment intent
 */
export async function cancelPaymentIntent(paymentIntentId: string) {
  return stripe.paymentIntents.cancel(paymentIntentId);
}
