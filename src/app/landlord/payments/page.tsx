'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Plus, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import {
  paymentStatusLabels,
  paymentStatusColors,
  paymentTypeLabels,
  paymentMethodLabels,
} from '@/lib/validators/payment';
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
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
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

interface Property {
  id: string;
  name: string;
}

export default function LandlordPaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  const fetchData = useCallback(async () => {
    try {
      // Fetch payments
      const paymentsResponse = await fetch('/api/landlord/payments');
      const paymentsResult = await paymentsResponse.json();
      if (paymentsResult.success) {
        setPayments(paymentsResult.data);

        // Extract unique properties
        const uniqueProperties = new Map<string, Property>();
        paymentsResult.data.forEach((payment: Payment) => {
          const prop = payment.lease.unit.property;
          if (!uniqueProperties.has(prop.id)) {
            uniqueProperties.set(prop.id, prop);
          }
        });
        setProperties(Array.from(uniqueProperties.values()));
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

  const filteredPayments = payments.filter((payment) => {
    if (selectedStatus !== 'all' && payment.status !== selectedStatus) {
      return false;
    }
    if (selectedProperty !== 'all' && payment.lease.unit.property.id !== selectedProperty) {
      return false;
    }
    return true;
  });

  const totalCollected = payments
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => {
      const amount = typeof p.totalAmount === 'string' ? parseFloat(p.totalAmount) : p.totalAmount;
      return sum + amount;
    }, 0);

  const pendingAmount = payments
    .filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING')
    .reduce((sum, p) => {
      const amount = typeof p.totalAmount === 'string' ? parseFloat(p.totalAmount) : p.totalAmount;
      return sum + amount;
    }, 0);

  const completedCount = payments.filter((p) => p.status === 'COMPLETED').length;
  const pendingCount = payments.filter((p) => p.status === 'PENDING' || p.status === 'PROCESSING').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track and manage rent payments</p>
        </div>
        <Link href="/landlord/payments/record">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalCollected)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">{pendingCount} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                payments
                  .filter((p) => {
                    const paymentDate = new Date(p.createdAt);
                    const now = new Date();
                    return (
                      p.status === 'COMPLETED' &&
                      paymentDate.getMonth() === now.getMonth() &&
                      paymentDate.getFullYear() === now.getFullYear()
                    );
                  })
                  .reduce((sum, p) => {
                    const amount = typeof p.totalAmount === 'string' ? parseFloat(p.totalAmount) : p.totalAmount;
                    return sum + amount;
                  }, 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">Collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PROCESSING">Processing</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REFUNDED">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Properties</SelectItem>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payments found</p>
              <p className="text-sm text-muted-foreground">
                Payments from your tenants will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <DollarSign className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {payment.user.firstName} {payment.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payment.lease.unit.property.name} - Unit {payment.lease.unit.unitNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {paymentTypeLabels[payment.type]} via {paymentMethodLabels[payment.method]}
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
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                    </p>
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
