'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ClipboardCheck, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Inspection {
  id: string;
  type: 'MOVE_IN' | 'MOVE_OUT';
  status: 'DRAFT' | 'COMPLETED';
  createdAt: string;
  completedAt: string | null;
  lease: {
    id: string;
    tenant: {
      firstName: string;
      lastName: string;
    };
    unit: {
      unitNumber: string;
      property: {
        name: string;
      };
    };
    depositAmount: string | number;
  };
}

interface ActiveLease {
  id: string;
  tenant: {
    firstName: string;
    lastName: string;
  };
  unit: {
    unitNumber: string;
    property: {
      name: string;
    };
  };
}

const typeBadgeColors: Record<string, string> = {
  MOVE_IN: 'bg-blue-100 text-blue-800',
  MOVE_OUT: 'bg-orange-100 text-orange-800',
};

const typeLabels: Record<string, string> = {
  MOVE_IN: 'Move-In',
  MOVE_OUT: 'Move-Out',
};

const statusBadgeColors: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  COMPLETED: 'Completed',
};

export default function LandlordInspectionsPage() {
  const { toast } = useToast();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [activeLeases, setActiveLeases] = useState<ActiveLease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create form state
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const fetchInspections = useCallback(async () => {
    try {
      const response = await fetch('/api/landlord/inspections');
      const result = await response.json();
      if (result.success) {
        setInspections(result.data.inspections || result.data);
        if (result.data.activeLeases) {
          setActiveLeases(result.data.activeLeases);
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load inspections',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchActiveLeases = useCallback(async () => {
    try {
      const response = await fetch('/api/landlord/leases?status=ACTIVE');
      const result = await response.json();
      if (result.success) {
        const leases = result.data.leases || result.data;
        setActiveLeases(
          leases.map((l: any) => ({
            id: l.id,
            tenant: l.tenant,
            unit: l.unit,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch active leases:', error);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
    fetchActiveLeases();
  }, [fetchInspections, fetchActiveLeases]);

  const handleCreate = async () => {
    if (!selectedLeaseId || !selectedType) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a lease and inspection type',
      });
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/landlord/inspections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: selectedLeaseId,
          type: selectedType,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Inspection created successfully',
        });
        setShowCreateForm(false);
        setSelectedLeaseId('');
        setSelectedType('');
        fetchInspections();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create inspection',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      });
    } finally {
      setIsCreating(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inspections</h1>
          <p className="text-muted-foreground">
            Manage move-in and move-out property inspections
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          New Inspection
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5" />
              Create New Inspection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Lease</label>
                <Select value={selectedLeaseId} onValueChange={setSelectedLeaseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lease" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeLeases.map((lease) => (
                      <SelectItem key={lease.id} value={lease.id}>
                        {lease.tenant.firstName} {lease.tenant.lastName} - {lease.unit.property.name} Unit {lease.unit.unitNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MOVE_IN">Move-In</SelectItem>
                    <SelectItem value="MOVE_OUT">Move-Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Inspection
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedLeaseId('');
                  setSelectedType('');
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspection List */}
      <Card>
        <CardHeader>
          <CardTitle>All Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          {inspections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No inspections yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first inspection to document property condition
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {inspections.map((inspection) => (
                <Link
                  key={inspection.id}
                  href={`/landlord/inspections/${inspection.id}`}
                  className="block"
                >
                  <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <h3 className="font-medium">
                          {inspection.lease.tenant.firstName} {inspection.lease.tenant.lastName}
                        </h3>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            typeBadgeColors[inspection.type]
                          )}
                        >
                          {typeLabels[inspection.type]}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            statusBadgeColors[inspection.status]
                          )}
                        >
                          {statusLabels[inspection.status]}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span>
                        {inspection.lease.unit.property.name} - Unit {inspection.lease.unit.unitNumber}
                      </span>
                      <span className="hidden sm:inline">&middot;</span>
                      <span>
                        {format(new Date(inspection.createdAt), 'MMM d, yyyy')}
                      </span>
                      {inspection.completedAt && (
                        <>
                          <span className="hidden sm:inline">&middot;</span>
                          <span className="text-green-600">
                            Completed {format(new Date(inspection.completedAt), 'MMM d, yyyy')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
