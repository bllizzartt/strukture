'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, FileText, Calendar, DollarSign, Building2, Users, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface Lease {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyRent: string | number;
  depositAmount: string | number;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  unit: {
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
}

interface Property {
  id: string;
  name: string;
}

interface Summary {
  total: number;
  active: number;
  expiring: number;
  pending: number;
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

export default function LandlordLeasesPage() {
  const { toast } = useToast();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, active: 0, expiring: 0, pending: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [removingLeaseId, setRemovingLeaseId] = useState<string | null>(null);
  const [deletingLeaseId, setDeletingLeaseId] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [leasesResponse, propertiesResponse] = await Promise.all([
        fetch('/api/landlord/leases'),
        fetch('/api/landlord/properties'),
      ]);

      const leasesResult = await leasesResponse.json();
      const propertiesResult = await propertiesResponse.json();

      if (leasesResult.success) {
        setLeases(leasesResult.data.leases);
        setSummary(leasesResult.data.summary);
      }

      if (propertiesResult.success) {
        setProperties(propertiesResult.data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load leases',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const handleRemoveLease = async (leaseId: string) => {
    setRemovingLeaseId(leaseId);
    try {
      const response = await fetch(`/api/landlord/leases/${leaseId}/terminate`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Lease Removed',
          description: 'Lease terminated and unit set to vacant.',
        });
        fetchData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to remove lease',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove lease',
      });
    } finally {
      setRemovingLeaseId(null);
    }
  };

  const handleDeleteLease = async (leaseId: string) => {
    setDeletingLeaseId(leaseId);
    try {
      const response = await fetch(`/api/landlord/leases/${leaseId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Lease Deleted',
          description: 'Lease record removed.',
        });
        fetchData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete lease',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete lease',
      });
    } finally {
      setDeletingLeaseId(null);
    }
  };

  const handleDeleteAllTerminated = async () => {
    setIsDeletingAll(true);
    try {
      const response = await fetch('/api/landlord/leases/delete-terminated', {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Terminated Leases Deleted',
          description: result.message,
        });
        fetchData();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete terminated leases',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete terminated leases',
      });
    } finally {
      setIsDeletingAll(false);
    }
  };

  const terminatedCount = leases.filter((l) => l.status === 'TERMINATED').length;

  // Filter leases
  const filteredLeases = leases.filter((lease) => {
    if (selectedProperty !== 'all' && lease.unit.property.id !== selectedProperty) {
      return false;
    }
    if (selectedStatus !== 'all' && lease.status !== selectedStatus) {
      return false;
    }
    return true;
  });

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
          <h1 className="text-3xl font-bold">Leases</h1>
          <p className="text-muted-foreground">Manage all your lease agreements</p>
        </div>
        <div className="flex gap-2">
          <Link href="/landlord/leases/templates">
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </Button>
          </Link>
          <Link href="/landlord/leases/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Lease
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leases</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">All leases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.active}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className={summary.expiring > 0 ? 'border-amber-200 bg-amber-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <Calendar className={cn('h-4 w-4', summary.expiring > 0 ? 'text-amber-600' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', summary.expiring > 0 && 'text-amber-600')}>
              {summary.expiring}
            </div>
            <p className="text-xs text-muted-foreground">Within 60 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting signature</p>
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
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING_SIGNATURE">Pending Signature</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="TERMINATED">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {terminatedCount > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeletingAll}>
                    {isDeletingAll ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete All Terminated ({terminatedCount})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Terminated Leases</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {terminatedCount} terminated lease{terminatedCount !== 1 ? 's' : ''} from
                      your records. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAllTerminated}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Delete All
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leases List */}
      <Card>
        <CardHeader>
          <CardTitle>Leases</CardTitle>
          <CardDescription>
            {filteredLeases.length} lease{filteredLeases.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLeases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No leases found</p>
              <p className="text-sm text-muted-foreground">
                Leases will appear here once they are created
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLeases.map((lease) => {
                const daysUntilExpiry = differenceInDays(new Date(lease.endDate), new Date());
                const isExpiringSoon = lease.status === 'ACTIVE' && daysUntilExpiry <= 60;

                return (
                  <div
                    key={lease.id}
                    className={cn(
                      'flex items-start justify-between p-4 border rounded-lg',
                      isExpiringSoon && 'border-amber-200 bg-amber-50'
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {lease.tenant.firstName} {lease.tenant.lastName}
                        </h3>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            leaseStatusColors[lease.status] || 'bg-gray-100 text-gray-800'
                          )}
                        >
                          {leaseStatusLabels[lease.status] || lease.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lease.unit.property.name} - Unit {lease.unit.unitNumber}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(lease.monthlyRent)}/mo
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(lease.startDate), 'MMM d, yyyy')} - {format(new Date(lease.endDate), 'MMM d, yyyy')}
                        </span>
                        {isExpiringSoon && (
                          <span className="text-amber-600 font-medium">
                            ({daysUntilExpiry} days remaining)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/landlord/tenants/${lease.tenant.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                      {(lease.status === 'ACTIVE' || lease.status === 'PENDING_SIGNATURE') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={removingLeaseId === lease.id}
                            >
                              {removingLeaseId === lease.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove Lease</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will terminate the lease for {lease.tenant.firstName} {lease.tenant.lastName} at{' '}
                                {lease.unit.property.name} - Unit {lease.unit.unitNumber} and set the unit back to vacant.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveLease(lease.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Remove Lease
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      {(lease.status === 'TERMINATED' || lease.status === 'EXPIRED') && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={deletingLeaseId === lease.id}
                            >
                              {deletingLeaseId === lease.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Lease Record</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete the lease record for {lease.tenant.firstName} {lease.tenant.lastName} at{' '}
                                {lease.unit.property.name} - Unit {lease.unit.unitNumber}.
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteLease(lease.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
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
