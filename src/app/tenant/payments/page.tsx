'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Plus, CreditCard, DollarSign, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import { paymentStatusLabels, paymentStatusColors, paymentTypeLabels } from '@/lib/validators/payment';
import { format } from 'date-fns';

interface Payment {
  id: string;
  type: string;
  method: string;
  status: string;
  amount: string | number;
  totalAmount: string | number;
  dueDate: string;
  createdAt: string;
  processedAt: string | null;
  lease: {
    unit: {
      unitNumber: string;
      property: {
        id: string;
        name: string;
      };
    };
  };
}

interface Lease {
  id: string;
  status: string;
  monthlyRent: string | number;
  startDate: string;
  endDate: string;
  unit: {
    unitNumber: string;
    property: {
      name: string;
    };
  };
}

export default function TenantPaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeLease, setActiveLease] = useState<Lease | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      // Fetch payments
      const paymentsResponse = await fetch('/api/tenant/payments');
      const paymentsResult = await paymentsResponse.json();
      if (paymentsResult.success) {
        setPayments(paymentsResult.data);
      }

      // Fetch active lease
      const leaseResponse = await fetch('/api/tenant/lease');
      const leaseResult = await leaseResponse.json();
      if (leaseResult.success && leaseResult.data) {
        setActiveLease(leaseResult.data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load payment data',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRentDue = () => {
    if (!activeLease) return 0;
    const rent = typeof activeLease.monthlyRent === 'string'
      ? parseFloat(activeLease.monthlyRent)
      : activeLease.monthlyRent;

    // Check if current month's rent has been paid
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const paidThisMonth = payments.some(p => {
      const paymentDate = new Date(p.createdAt);
      return (
        p.type === 'RENT' &&
        p.status === 'COMPLETED' &&
        paymentDate.getMonth() === currentMonth &&
        paymentDate.getFullYear() === currentYear
      );
    });

    return paidThisMonth ? 0 : rent;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rentDue = getRentDue();
  const pendingPayments = payments.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING');
  const recentPayments = payments.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage your rent payments</p>
        </div>
        <Link href="/tenant/payments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Make Payment
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rent Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              rentDue > 0 ? "text-destructive" : "text-green-600"
            )}>
              {formatCurrency(rentDue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {rentDue > 0 ? 'Due by the 1st' : 'All paid for this month'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              {pendingPayments.length === 0 ? 'No pending payments' : 'Being processed'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payment Methods</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Link href="/tenant/payments/methods">
              <Button variant="outline" className="w-full">
                Manage Methods
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Active Lease Info */}
      {activeLease && (
        <Card>
          <CardHeader>
            <CardTitle>Current Lease</CardTitle>
            <CardDescription>
              {activeLease.unit.property.name} - Unit {activeLease.unit.unitNumber}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(
                    typeof activeLease.monthlyRent === 'string'
                      ? parseFloat(activeLease.monthlyRent)
                      : activeLease.monthlyRent
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lease Start</p>
                <p className="text-lg font-semibold">
                  {format(new Date(activeLease.startDate), 'MMM d, yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lease End</p>
                <p className="text-lg font-semibold">
                  {format(new Date(activeLease.endDate), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Payments</CardTitle>
            <CardDescription>Your payment history</CardDescription>
          </div>
          <Link href="/tenant/payments/history">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payments yet</p>
              <p className="text-sm text-muted-foreground">
                Your payment history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{paymentTypeLabels[payment.type]}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatCurrency(
                        typeof payment.totalAmount === 'string'
                          ? parseFloat(payment.totalAmount)
                          : payment.totalAmount
                      )}
                    </p>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        paymentStatusColors[payment.status]
                      )}
                    >
                      {paymentStatusLabels[payment.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
