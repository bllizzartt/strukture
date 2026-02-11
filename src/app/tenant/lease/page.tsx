'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Loader2, FileText, Calendar, DollarSign, Home, Clock, AlertCircle, PenLine, Shield, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import type { LeaseDocumentData } from '@/components/lease/lease-document';

const PdfDownloadButton = dynamic(
  () => import('@/components/lease/pdf-download-button').then((mod) => ({ default: mod.PdfDownloadButton })),
  { ssr: false }
);

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
  templateId: string | null;
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
      owner?: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
      };
    };
  };
  template?: {
    id: string;
    name: string;
  } | null;
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
  const [pdfData, setPdfData] = useState<LeaseDocumentData | null>(null);

  const fetchLease = useCallback(async () => {
    try {
      const response = await fetch('/api/tenant/lease');
      const result = await response.json();
      if (result.success && result.data) {
        setLease(result.data);
      }
    } catch {
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

  const fetchPdfData = async () => {
    if (!lease) return;
    try {
      const response = await fetch(`/api/lease/${lease.id}/pdf`);
      const result = await response.json();
      if (result.success) {
        setPdfData(result.data);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load PDF data' });
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
  const isFullySigned = !!lease.tenantSignedAt && !!lease.landlordSignedAt;
  const needsTenantSignature = !lease.tenantSignedAt && lease.status === 'PENDING_SIGNATURE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lease</h1>
          <p className="text-muted-foreground">View your lease details</p>
        </div>
        <div className="flex items-center gap-2">
          {needsTenantSignature && (
            <Link href={`/lease/sign/${lease.id}`}>
              <Button>
                <PenLine className="mr-2 h-4 w-4" />
                Review & Sign
              </Button>
            </Link>
          )}
          {isFullySigned && (
            <Link href={`/lease/sign/${lease.id}`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Full Lease
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Pending Signature Alert */}
      {needsTenantSignature && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <PenLine className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Your signature is required</p>
                <p className="text-sm text-amber-700 mt-1">
                  Please review and sign the lease agreement to activate your tenancy.
                </p>
                <Link href={`/lease/sign/${lease.id}`}>
                  <Button className="mt-3" size="sm">
                    Review & Sign Lease
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Signed Lease Document Section */}
      {isFullySigned && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Signed Lease Document
            </CardTitle>
            <CardDescription>
              Your lease has been signed by both parties and is legally binding.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
              <div>
                <p className="font-medium text-green-800">Lease Agreement - Fully Executed</p>
                <div className="flex gap-4 mt-1 text-sm text-green-700">
                  {lease.tenantSignedAt && (
                    <span>Tenant signed: {format(new Date(lease.tenantSignedAt), 'MMM d, yyyy')}</span>
                  )}
                  {lease.landlordSignedAt && (
                    <span>Landlord signed: {format(new Date(lease.landlordSignedAt), 'MMM d, yyyy')}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {pdfData ? (
                  <PdfDownloadButton
                    data={pdfData}
                    fileName={`lease-${lease.unit.property.name}-unit-${lease.unit.unitNumber}.pdf`}
                  />
                ) : (
                  <Button onClick={fetchPdfData} variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              This lease was signed electronically in compliance with the ESIGN Act and the New Mexico UETA. A complete audit trail has been securely stored.
            </p>
          </CardContent>
        </Card>
      )}

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
          {lease.unit.property.owner && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-2">Property Manager</p>
              <p className="font-medium">{lease.unit.property.owner.firstName} {lease.unit.property.owner.lastName}</p>
              <p className="text-sm text-muted-foreground">{lease.unit.property.owner.email}</p>
              {lease.unit.property.owner.phone && (
                <p className="text-sm text-muted-foreground">{lease.unit.property.owner.phone}</p>
              )}
            </div>
          )}
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
