'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, FileText, Calendar, DollarSign, Home, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface Lease {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: string | number;
  depositAmount: string | number;
  lateFee: string | number | null;
  gracePeriodDays: number;
  rentDueDay: number;
  depositPaid: boolean;
  additionalTerms: string | null;
  petDeposit: string | number | null;
  petRent: string | number | null;
  tenantSignedAt: string | null;
  landlordSignedAt: string | null;
  moveInDate: string | null;
  moveOutDate: string | null;
  autoRenewal: boolean;
  unit: {
    unitNumber: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet: number | null;
    property: {
      id: string;
      name: string;
      addressLine1: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
}

const leaseStatusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
  PENDING_SIGNATURE: 'Pending Signature',
  DRAFT: 'Draft',
  RENEWED: 'Renewed',
};

const leaseStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  TERMINATED: 'bg-red-100 text-red-800',
  PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800',
  DRAFT: 'bg-blue-100 text-blue-800',
  RENEWED: 'bg-purple-100 text-purple-800',
};

export default function TenantLeasePage() {
  const { toast } = useToast();
  const [lease, setLease] = useState<Lease | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLease = useCallback(async () => {
    try {
      const response = await fetch('/api/tenant/lease');
      const result = await response.json();
      if (result.success && result.data) {
        setLease(result.data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load lease information',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLease();
  }, [fetchLease]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lease) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Lease</h1>
          <p className="text-muted-foreground">View your lease details</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Active Lease</p>
            <p className="text-sm text-muted-foreground">
              You don&apos;t have an active lease at the moment
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysRemaining = differenceInDays(new Date(lease.endDate), new Date());
  const isExpiringSoon = daysRemaining <= 60 && daysRemaining > 0;
  const monthlyRent = typeof lease.monthlyRent === 'string' ? parseFloat(lease.monthlyRent) : lease.monthlyRent;
  const depositAmount = typeof lease.depositAmount === 'string' ? parseFloat(lease.depositAmount) : lease.depositAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Lease</h1>
        <p className="text-muted-foreground">View your lease details</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Rent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyRent)}</div>
            <p className="text-xs text-muted-foreground">Due on the {lease.rentDueDay}st of each month</p>
          </CardContent>
        </Card>

        <Card className={isExpiringSoon ? 'border-amber-200 bg-amber-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lease Ends</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(new Date(lease.endDate), 'MMM d, yyyy')}</div>
            <p className={`text-xs ${isExpiringSoon ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Lease has ended'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ${leaseStatusColors[lease.status] || 'bg-gray-100 text-gray-800'}`}>
              {leaseStatusLabels[lease.status] || lease.status}
            </span>
            {lease.autoRenewal && (
              <p className="text-xs text-muted-foreground mt-2">Auto-renewal enabled</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            Property
          </CardTitle>
          <CardDescription>
            {lease.unit.property.name} - Unit {lease.unit.unitNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">
                {lease.unit.property.addressLine1}
              </p>
              <p className="font-medium">
                {lease.unit.property.city}, {lease.unit.property.state} {lease.unit.property.zipCode}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Bedrooms</p>
                <p className="font-medium">{lease.unit.bedrooms}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bathrooms</p>
                <p className="font-medium">{lease.unit.bathrooms}</p>
              </div>
              {lease.unit.squareFeet && (
                <div>
                  <p className="text-sm text-muted-foreground">Sq Ft</p>
                  <p className="font-medium">{lease.unit.squareFeet.toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lease Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Lease Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Start Date</p>
              <p className="font-medium">{format(new Date(lease.startDate), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">End Date</p>
              <p className="font-medium">{format(new Date(lease.endDate), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rent Due Day</p>
              <p className="font-medium">{lease.rentDueDay}st of each month</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Security Deposit</p>
              <p className="font-medium">{formatCurrency(depositAmount)}</p>
              <p className="text-xs text-muted-foreground">{lease.depositPaid ? 'Paid' : 'Not paid'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Grace Period</p>
              <p className="font-medium">{lease.gracePeriodDays} days</p>
            </div>
            {lease.lateFee && (
              <div>
                <p className="text-sm text-muted-foreground">Late Fee</p>
                <p className="font-medium">
                  {formatCurrency(typeof lease.lateFee === 'string' ? parseFloat(lease.lateFee) : lease.lateFee)}
                </p>
              </div>
            )}
            {lease.petDeposit && (
              <div>
                <p className="text-sm text-muted-foreground">Pet Deposit</p>
                <p className="font-medium">
                  {formatCurrency(typeof lease.petDeposit === 'string' ? parseFloat(lease.petDeposit) : lease.petDeposit)}
                </p>
              </div>
            )}
            {lease.petRent && (
              <div>
                <p className="text-sm text-muted-foreground">Pet Rent</p>
                <p className="font-medium">
                  {formatCurrency(typeof lease.petRent === 'string' ? parseFloat(lease.petRent) : lease.petRent)}/mo
                </p>
              </div>
            )}
            {lease.moveInDate && (
              <div>
                <p className="text-sm text-muted-foreground">Move-in Date</p>
                <p className="font-medium">{format(new Date(lease.moveInDate), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {lease.additionalTerms && (
            <div className="mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Additional Terms</p>
              <p className="text-sm whitespace-pre-wrap">{lease.additionalTerms}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
