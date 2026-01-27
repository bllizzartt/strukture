import { z } from 'zod';

// Payment method types
export const paymentMethods = ['ACH', 'DEBIT_CARD', 'CREDIT_CARD', 'CASHIER_CHECK', 'CASH', 'OTHER'] as const;
export const paymentTypes = ['RENT', 'DEPOSIT', 'LATE_FEE', 'UTILITY', 'MAINTENANCE', 'OTHER'] as const;
export const paymentStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED'] as const;

// Create payment schema
export const createPaymentSchema = z.object({
  leaseId: z.string().min(1, 'Lease is required'),
  type: z.enum(paymentTypes, {
    errorMap: () => ({ message: 'Please select a payment type' }),
  }),
  method: z.enum(paymentMethods, {
    errorMap: () => ({ message: 'Please select a payment method' }),
  }),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Manual payment schema (for landlord recording check payments, etc.)
export const recordManualPaymentSchema = z.object({
  leaseId: z.string().min(1, 'Lease is required'),
  tenantId: z.string().min(1, 'Tenant is required'),
  type: z.enum(paymentTypes),
  method: z.enum(['CASHIER_CHECK', 'CASH', 'OTHER']),
  amount: z.number().min(0.01),
  checkNumber: z.string().max(50).optional(),
  checkDate: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// Add payment method schema
export const addPaymentMethodSchema = z.object({
  type: z.enum(['ACH', 'DEBIT_CARD', 'CREDIT_CARD']),
  nickname: z.string().max(50).optional(),
  isDefault: z.boolean().optional().default(false),
  // For ACH
  accountNumber: z.string().optional(),
  routingNumber: z.string().optional(),
  accountType: z.enum(['checking', 'savings']).optional(),
  // Stripe payment method ID (when using Stripe Elements)
  stripePaymentMethodId: z.string().optional(),
});

// Types
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type RecordManualPaymentInput = z.infer<typeof recordManualPaymentSchema>;
export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;

// Labels
export const paymentMethodLabels: Record<string, string> = {
  ACH: 'Bank Account (ACH)',
  DEBIT_CARD: 'Debit Card',
  CREDIT_CARD: 'Credit Card',
  CASHIER_CHECK: "Cashier's Check",
  CASH: 'Cash',
  OTHER: 'Other',
};

export const paymentTypeLabels: Record<string, string> = {
  RENT: 'Rent',
  DEPOSIT: 'Security Deposit',
  LATE_FEE: 'Late Fee',
  UTILITY: 'Utility',
  MAINTENANCE: 'Maintenance',
  OTHER: 'Other',
};

export const paymentStatusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  CANCELLED: 'Cancelled',
};

// Status colors for UI
export const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};
