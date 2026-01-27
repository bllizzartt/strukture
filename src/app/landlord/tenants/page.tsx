'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Users, Calendar, DollarSign, Mail, Phone, Building2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface Tenant {
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    createdAt: string;
  };
  leases: Array<{
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: string;
    unit: {
      unitNumber: string;
      property: {
        id: string;
        name: string;
      };
    };
  }>;
  activeLease: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyRent: string;
    unit: {
      unitNumber: string;
      property: {
        id: string;
        name: string;
      };
    };
  } | null;
  lastPayment: {
    id: string;
    amount: string;
    status: string;
    createdAt: string;
  } | null;
}

interface Property {
  id: string;
  name: string;
}

interface Summary {
  total: number;
  active: number;
  expiringLeases: number;
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

export default function LandlordTenantsPage() {
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, expiringLeases: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tenantsResponse, propertiesResponse] = await Promise.all([
        fetch('/api/landlord/tenants'),
        fetch('/api/landlord/properties'),
      ]);

      const tenantsResult = await tenantsResponse.json();
      const propertiesResult = await propertiesResponse.json();

      if (tenantsResult.success) {
        setTenants(tenantsResult.data.tenants);
        setSummary(tenantsResult.data.summary);
      }

      if (propertiesResult.success) {
        setProperties(propertiesResult.data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load tenants',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tenants
  const filteredTenants = tenants.filter((t) => {
    if (selectedProperty !== 'all') {
      const hasPropertyLease = t.leases.some(
        (l) => l.unit.property.id === selectedProperty
      );
      if (!hasPropertyLease) return false;
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active' && !t.activeLease) return false;
      if (selectedStatus === 'inactive' && t.activeLease) return false;
    }

    return true;
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tenants</h1>
        <p className="text-muted-foreground">Manage your tenants and leases</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">
              {summary.active} with active leases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.active}</div>
            <p className="text-xs text-muted-foreground">Currently renting</p>
          </CardContent>
        </Card>

        <Card className={summary.expiringLeases > 0 ? 'border-amber-200 bg-amber-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar
              className={cn(
                'h-4 w-4',
                summary.expiringLeases > 0 ? 'text-amber-600' : 'text-muted-foreground'
              )}
            />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                'text-2xl font-bold',
                summary.expiringLeases > 0 && 'text-amber-600'
              )}
            >
              {summary.expiringLeases}
            </div>
            <p className="text-xs text-muted-foreground">Within 60 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
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
            <div className="flex-1">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tenants</SelectItem>
                  <SelectItem value="active">Active Leases</SelectItem>
                  <SelectItem value="inactive">No Active Lease</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants List */}
      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>
            {filteredTenants.length} tenant{filteredTenants.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTenants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tenants found</p>
              <p className="text-sm text-muted-foreground">
                Tenants will appear here once they sign a lease
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTenants.map((item) => {
                const daysUntilExpiry = item.activeLease
                  ? differenceInDays(new Date(item.activeLease.endDate), new Date())
                  : null;
                const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 60;

                return (
                  <div
                    key={item.tenant.id}
                    className={cn(
                      'flex items-start justify-between p-4 border rounded-lg',
                      isExpiringSoon && 'border-amber-200 bg-amber-50'
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {item.tenant.firstName} {item.tenant.lastName}
                        </h3>
                        {item.activeLease && (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                              leaseStatusColors[item.activeLease.status]
                            )}
                          >
                            {leaseStatusLabels[item.activeLease.status]}
                          </span>
                        )}
                        {!item.activeLease && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                            No Active Lease
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {item.tenant.email}
                        </span>
                        {item.tenant.phone && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {item.tenant.phone}
                            </span>
                          </>
                        )}
                      </div>

                      {item.activeLease && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {item.activeLease.unit.property.name} - Unit{' '}
                            {item.activeLease.unit.unitNumber}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(item.activeLease.monthlyRent)}/mo
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Expires: {format(new Date(item.activeLease.endDate), 'MMM d, yyyy')}
                            {isExpiringSoon && (
                              <span className="text-amber-600 font-medium">
                                ({daysUntilExpiry} days)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <Link href={`/landlord/tenants/${item.tenant.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
