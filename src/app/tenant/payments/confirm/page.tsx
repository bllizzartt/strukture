'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function PaymentConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    const paymentIntent = searchParams.get('payment_intent');
    const redirectStatus = searchParams.get('redirect_status');

    if (redirectStatus === 'succeeded') {
      setStatus('success');
    } else if (redirectStatus === 'failed') {
      setStatus('failed');
    } else {
      // Check payment status from our API
      if (paymentIntent) {
        checkPaymentStatus(paymentIntent);
      }
    }
  }, [searchParams]);

  const checkPaymentStatus = async (paymentIntentId: string) => {
    try {
      const response = await fetch(`/api/tenant/payments/status?payment_intent=${paymentIntentId}`);
      const result = await response.json();

      if (result.success && result.data.status === 'succeeded') {
        setStatus('success');
      } else {
        setStatus('failed');
      }
    } catch (error) {
      setStatus('failed');
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Confirming your payment...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-6">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold">Payment Successful!</h1>
          <p className="text-muted-foreground mt-2">
            Your payment has been processed successfully.
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What happens next?</CardTitle>
          </CardHeader>
          <CardContent className="text-left text-sm text-muted-foreground space-y-2">
            <p>• You will receive a confirmation email shortly</p>
            <p>• The payment will appear in your payment history</p>
            <p>• Your landlord will be notified of the payment</p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/tenant/payments">
            <Button>View Payments</Button>
          </Link>
          <Link href="/tenant/dashboard">
            <Button variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
          <XCircle className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold">Payment Failed</h1>
        <p className="text-muted-foreground mt-2">
          We were unable to process your payment.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What you can do</CardTitle>
        </CardHeader>
        <CardContent className="text-left text-sm text-muted-foreground space-y-2">
          <p>• Check your payment details and try again</p>
          <p>• Make sure you have sufficient funds</p>
          <p>• Try a different payment method</p>
          <p>• Contact your bank if the issue persists</p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/tenant/payments/new">
          <Button>Try Again</Button>
        </Link>
        <Link href="/tenant/payments">
          <Button variant="outline">View Payments</Button>
        </Link>
      </div>
    </div>
  );
}

export default function PaymentConfirmPage() {
  return (
    <div className="space-y-6">
      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        }
      >
        <PaymentConfirmContent />
      </Suspense>
    </div>
  );
}
