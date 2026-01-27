'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { ArrowLeft, Loader2, CreditCard, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { paymentTypeLabels } from '@/lib/validators/payment';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface Lease {
  id: string;
  monthlyRent: string | number;
  depositAmount: string | number;
  depositPaid: boolean;
  unit: {
    unitNumber: string;
    property: {
      name: string;
    };
  };
}

function PaymentForm({
  lease,
  paymentType,
  amount,
  onSuccess,
}: {
  lease: Lease;
  paymentType: string;
  amount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/tenant/payments/confirm`,
        },
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Payment Failed',
          description: error.message || 'An error occurred while processing your payment.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Payment Amount</span>
          <span className="text-2xl font-bold">{formatCurrency(amount)}</span>
        </div>
      </div>

      <div className="space-y-4">
        <Label>Payment Details</Label>
        <div className="border rounded-lg p-4">
          <PaymentElement />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={!stripe || isProcessing}>
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pay {formatCurrency(amount)}
          </>
        )}
      </Button>
    </form>
  );
}

export default function NewPaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [lease, setLease] = useState<Lease | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentType, setPaymentType] = useState<string>('RENT');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  const fetchLease = useCallback(async () => {
    try {
      const response = await fetch('/api/tenant/lease');
      const result = await response.json();

      if (result.success && result.data) {
        setLease(result.data);
        // Set default amount based on payment type
        const rent = typeof result.data.monthlyRent === 'string'
          ? parseFloat(result.data.monthlyRent)
          : result.data.monthlyRent;
        setCustomAmount(rent.toString());
      } else {
        toast({
          variant: 'destructive',
          title: 'No Active Lease',
          description: 'You need an active lease to make payments.',
        });
        router.push('/tenant/dashboard');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load lease information.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, router]);

  useEffect(() => {
    fetchLease();
  }, [fetchLease]);

  const getDefaultAmount = () => {
    if (!lease) return 0;

    if (paymentType === 'RENT') {
      return typeof lease.monthlyRent === 'string'
        ? parseFloat(lease.monthlyRent)
        : lease.monthlyRent;
    }

    if (paymentType === 'DEPOSIT' && !lease.depositPaid) {
      return typeof lease.depositAmount === 'string'
        ? parseFloat(lease.depositAmount)
        : lease.depositAmount;
    }

    return parseFloat(customAmount) || 0;
  };

  const handlePaymentTypeChange = (type: string) => {
    setPaymentType(type);
    setClientSecret(null);

    if (!lease) return;

    if (type === 'RENT') {
      const rent = typeof lease.monthlyRent === 'string'
        ? parseFloat(lease.monthlyRent)
        : lease.monthlyRent;
      setCustomAmount(rent.toString());
    } else if (type === 'DEPOSIT') {
      const deposit = typeof lease.depositAmount === 'string'
        ? parseFloat(lease.depositAmount)
        : lease.depositAmount;
      setCustomAmount(deposit.toString());
    }
  };

  const handleCreatePayment = async () => {
    if (!lease) return;

    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount.',
      });
      return;
    }

    setIsCreatingPayment(true);

    try {
      const response = await fetch('/api/tenant/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: lease.id,
          type: paymentType,
          method: 'CREDIT_CARD',
          amount,
        }),
      });

      const result = await response.json();

      if (result.success && result.data.clientSecret) {
        setClientSecret(result.data.clientSecret);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to initialize payment.',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lease) {
    return null;
  }

  const amount = parseFloat(customAmount) || 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tenant/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Make a Payment</h1>
          <p className="text-muted-foreground">Pay rent or other charges</p>
        </div>
      </div>

      {/* Lease Info */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">{lease.unit.property.name}</p>
            <p className="text-sm text-muted-foreground">Unit {lease.unit.unitNumber}</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Select payment type and amount</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!clientSecret ? (
            <>
              <div className="space-y-2">
                <Label>Payment Type</Label>
                <Select value={paymentType} onValueChange={handlePaymentTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RENT">Rent</SelectItem>
                    {!lease.depositPaid && (
                      <SelectItem value="DEPOSIT">Security Deposit</SelectItem>
                    )}
                    <SelectItem value="LATE_FEE">Late Fee</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleCreatePayment}
                disabled={isCreatingPayment || amount <= 0}
              >
                {isCreatingPayment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing Payment...
                  </>
                ) : (
                  `Continue to Pay ${formatCurrency(amount)}`
                )}
              </Button>
            </>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                },
              }}
            >
              <PaymentForm
                lease={lease}
                paymentType={paymentType}
                amount={amount}
                onSuccess={() => router.push('/tenant/payments')}
              />
            </Elements>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
