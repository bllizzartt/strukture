'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, CheckCircle, AlertTriangle, Building2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TenantInsurancePolicy {
  id: string;
  provider: string;
  policyNumber: string;
  coverageAmount: number | string;
  startDate: string;
  endDate: string;
  isVerified: boolean;
  documentUrl: string | null;
  createdAt: string;
  tenant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  unit: {
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
}

interface PropertyGroup {
  propertyId: string;
  propertyName: string;
  policies: TenantInsurancePolicy[];
}

export default function LandlordInsurancePage() {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<TenantInsurancePolicy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      const response = await fetch('/api/landlord/insurance');
      const result = await response.json();
      if (result.success) {
        setPolicies(result.data);
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load insurance policies',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    try {
      const response = await fetch('/api/landlord/insurance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isVerified: true }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Policy Verified',
          description: 'The insurance policy has been marked as verified',
        });
        fetchPolicies();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to verify policy',
        });
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to verify policy',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const today = new Date();
  const totalPolicies = policies.length;
  const verifiedCount = policies.filter((p) => p.isVerified).length;
  const expiredCount = policies.filter((p) => new Date(p.endDate) < today).length;
  const pendingCount = totalPolicies - verifiedCount - expiredCount;

  const propertyGroups: PropertyGroup[] = [];
  const propertyMap = new Map<string, PropertyGroup>();

  policies.forEach((policy) => {
    const propId = policy.unit.property.id;
    if (!propertyMap.has(propId)) {
      const group: PropertyGroup = {
        propertyId: propId,
        propertyName: policy.unit.property.name,
        policies: [],
      };
      propertyMap.set(propId, group);
      propertyGroups.push(group);
    }
    propertyMap.get(propId)!.policies.push(policy);
  });

  const getStatusBadge = (policy: TenantInsurancePolicy) => {
    if (new Date(policy.endDate) < today) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          <AlertTriangle className="h-3 w-3" />
          Expired
        </span>
      );
    }

    if (policy.isVerified) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          <CheckCircle className="h-3 w-3" />
          Verified
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
        <AlertTriangle className="h-3 w-3" />
        Pending
      </span>
    );
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
        <h1 className="text-3xl font-bold">Tenant Insurance</h1>
        <p className="text-muted-foreground">Review and verify tenant insurance policies</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPolicies}</div>
            <p className="text-xs text-muted-foreground">All tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
            <p className="text-xs text-muted-foreground">Confirmed active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className={expiredCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className={cn('h-4 w-4', expiredCount > 0 ? 'text-red-600' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', expiredCount > 0 && 'text-red-600')}>
              {expiredCount}
            </div>
            <p className="text-xs text-muted-foreground">Needs renewal</p>
          </CardContent>
        </Card>
      </div>

      {/* Policy List Grouped by Property */}
      {policies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Insurance Policies</p>
            <p className="text-sm text-muted-foreground">
              Tenant insurance policies will appear here once submitted
            </p>
          </CardContent>
        </Card>
      ) : (
        propertyGroups.map((group) => (
          <Card key={group.propertyId}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {group.propertyName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {group.policies.map((policy) => {
                  const coverage =
                    typeof policy.coverageAmount === 'string'
                      ? parseFloat(policy.coverageAmount)
                      : policy.coverageAmount;
                  const isExpired = new Date(policy.endDate) < today;

                  return (
                    <div
                      key={policy.id}
                      className={cn(
                        'p-4 border rounded-lg space-y-2',
                        isExpired && 'border-red-200 bg-red-50/50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            {policy.tenant.firstName} {policy.tenant.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Unit {policy.unit.unitNumber}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(policy)}
                          {!policy.isVerified && !isExpired && (
                            <Button
                              size="sm"
                              onClick={() => handleVerify(policy.id)}
                              disabled={verifyingId === policy.id}
                            >
                              {verifyingId === policy.id ? (
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-2 h-3 w-3" />
                              )}
                              Verify
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Provider</p>
                          <p className="font-medium">{policy.provider}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Policy #</p>
                          <p className="font-medium">{policy.policyNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Coverage</p>
                          <p className="font-medium">{formatCurrency(coverage)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expires</p>
                          <p className="font-medium">
                            {format(new Date(policy.endDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
