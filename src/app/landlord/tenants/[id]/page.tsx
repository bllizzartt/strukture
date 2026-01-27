'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Building2,
  DollarSign,
  Wrench,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface TenantData {
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    dateOfBirth: string | null;
    emergencyContact: {
      name: string;
      phone: string | null;
      relation: string | null;
    } | null;
    createdAt: string;
  };
  leases: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: string;
    depositAmount: string;
    depositPaid: boolean;
    unit: {
      unitNumber: string;
      property: {
        id: string;
        name: string;
        addressLine1: string;
        city: string;
        state: string;
        zipCode: string;
      };
    };
    payments: Array<{
      id: string;
      type: string;
      status: string;
      amount: string;
      totalAmount: string;
      dueDate: string;
      createdAt: string;
    }>;
  }>;
  activeLease: any | null;
  maintenanceRequests: Array<{
    id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
  }>;
  paymentSummary: {
    totalPaid: number;
    pendingPayments: number;
    latePayments: number;
    recentPayments: Array<{
      id: string;
      type: string;
      status: string;
      amount: string;
      totalAmount: string;
      dueDate: string;
      createdAt: string;
    }>;
  };
}

const leaseStatusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  TERMINATED: 'Terminated',
  PENDING_SIGNATURE: 'Pending Signature',
  DRAFT: 'Draft',
};

const leaseStatusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  TERMINATED: 'bg-red-100 text-red-800',
  PENDING_SIGNATURE: 'bg-yellow-100 text-yellow-800',
  DRAFT: 'bg-blue-100 text-blue-800',
};

const paymentStatusLabels: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const paymentStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
};

const maintenanceStatusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const maintenanceStatusColors: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  ON_HOLD: 'bg-gray-100 text-gray-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<TenantData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tenantId = params.id as string;

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const fetchTenant = async () => {
    try {
      const response = await fetch(`/api/landlord/tenants/${tenantId}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Tenant not found',
        });
        router.push('/landlord/tenants');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load tenant',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { tenant, leases, activeLease, maintenanceRequests, paymentSummary } = data;
  const daysUntilExpiry = activeLease
    ? differenceInDays(new Date(activeLease.endDate), new Date())
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/landlord/tenants">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {tenant.firstName} {tenant.lastName}
          </h1>
          <p className="text-muted-foreground">
            Tenant since {format(new Date(tenant.createdAt), 'MMMM yyyy')}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Lease Summary */}
          {activeLease && (
            <Card
              className={cn(
                daysUntilExpiry !== null && daysUntilExpiry <= 60 && 'border-amber-200'
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Current Lease
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Property</p>
                    <p className="font-medium">{activeLease.unit.property.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {activeLease.unit.property.addressLine1}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activeLease.unit.property.city}, {activeLease.unit.property.state}{' '}
                      {activeLease.unit.property.zipCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unit</p>
                    <p className="font-medium">{activeLease.unit.unitNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="font-medium">{formatCurrency(activeLease.monthlyRent)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lease Period</p>
                    <p className="font-medium">
                      {format(new Date(activeLease.startDate), 'MMM d, yyyy')} -{' '}
                      {format(new Date(activeLease.endDate), 'MMM d, yyyy')}
                    </p>
                    {daysUntilExpiry !== null && daysUntilExpiry <= 60 && (
                      <p className="text-sm text-amber-600 font-medium">
                        Expires in {daysUntilExpiry} days
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment History
              </CardTitle>
              <CardDescription>Recent payment activity</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentSummary.recentPayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No payments yet</p>
              ) : (
                <div className="space-y-3">
                  {paymentSummary.recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium">{formatCurrency(payment.totalAmount)}</p>
                        <p className="text-sm text-muted-foreground">
                          {payment.type.replace('_', ' ')} •{' '}
                          {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          paymentStatusColors[payment.status]
                        )}
                      >
                        {paymentStatusLabels[payment.status]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Requests
              </CardTitle>
              <CardDescription>Recent maintenance activity</CardDescription>
            </CardHeader>
            <CardContent>
              {maintenanceRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No maintenance requests
                </p>
              ) : (
                <div className="space-y-3">
                  {maintenanceRequests.map((request) => (
                    <Link
                      key={request.id}
                      href={`/landlord/maintenance/${request.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded">
                        <div>
                          <p className="font-medium">{request.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.category.replace('_', ' ')} •{' '}
                            {format(new Date(request.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            maintenanceStatusColors[request.status]
                          )}
                        >
                          {maintenanceStatusLabels[request.status]}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lease History */}
          <Card>
            <CardHeader>
              <CardTitle>Lease History</CardTitle>
              <CardDescription>All leases with this tenant</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leases.map((lease) => (
                  <div
                    key={lease.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {lease.unit.property.name} - Unit {lease.unit.unitNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(lease.startDate), 'MMM d, yyyy')} -{' '}
                        {format(new Date(lease.endDate), 'MMM d, yyyy')} •{' '}
                        {formatCurrency(lease.monthlyRent)}/mo
                      </p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        leaseStatusColors[lease.status]
                      )}
                    >
                      {leaseStatusLabels[lease.status]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${tenant.email}`} className="hover:underline">
                  {tenant.email}
                </a>
              </div>
              {tenant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${tenant.phone}`} className="hover:underline">
                    {tenant.phone}
                  </a>
                </div>
              )}
              {tenant.dateOfBirth && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(tenant.dateOfBirth), 'MMMM d, yyyy')}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          {tenant.emergencyContact && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="font-medium">{tenant.emergencyContact.name}</p>
                {tenant.emergencyContact.relation && (
                  <p className="text-sm text-muted-foreground">
                    {tenant.emergencyContact.relation}
                  </p>
                )}
                {tenant.emergencyContact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    <a href={`tel:${tenant.emergencyContact.phone}`} className="hover:underline">
                      {tenant.emergencyContact.phone}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-medium">{formatCurrency(paymentSummary.totalPaid)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pending Payments</span>
                <span className="font-medium">{paymentSummary.pendingPayments}</span>
              </div>
              {paymentSummary.latePayments > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Late Payments</span>
                  <span className="font-medium">{paymentSummary.latePayments}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
