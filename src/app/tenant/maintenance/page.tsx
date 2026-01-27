'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Wrench, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  maintenanceStatusLabels,
  maintenanceStatusColors,
  maintenancePriorityLabels,
  maintenancePriorityColors,
  maintenanceCategoryLabels,
} from '@/lib/validators/maintenance';
import { format } from 'date-fns';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  acknowledgedAt: string | null;
  completedAt: string | null;
  unit: {
    unitNumber: string;
    property: {
      id: string;
      name: string;
    };
  };
  updates: Array<{
    id: string;
    message: string;
    createdAt: string;
    newStatus: string;
  }>;
}

export default function TenantMaintenancePage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/tenant/maintenance');
      const result = await response.json();
      if (result.success) {
        setRequests(result.data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load maintenance requests',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const openRequests = requests.filter(
    (r) => !['COMPLETED', 'CANCELLED'].includes(r.status)
  );
  const completedRequests = requests.filter((r) => r.status === 'COMPLETED');

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
          <h1 className="text-3xl font-bold">Maintenance</h1>
          <p className="text-muted-foreground">Submit and track repair requests</p>
        </div>
        <Link href="/tenant/maintenance/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRequests.length}</div>
            <p className="text-xs text-muted-foreground">
              {openRequests.length === 0 ? 'No open requests' : 'Being processed'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedRequests.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emergency</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {requests.filter((r) => r.priority === 'EMERGENCY' && r.status !== 'COMPLETED').length}
            </div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Requests</CardTitle>
          <CardDescription>
            {requests.length} request{requests.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No maintenance requests</p>
              <p className="text-sm text-muted-foreground mb-4">
                Submit a request when you need something fixed
              </p>
              <Link href="/tenant/maintenance/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Request
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/tenant/maintenance/${request.id}`}
                  className="block"
                >
                  <div className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{request.title}</h3>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            maintenancePriorityColors[request.priority]
                          )}
                        >
                          {maintenancePriorityLabels[request.priority]}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {request.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{maintenanceCategoryLabels[request.category]}</span>
                        <span>•</span>
                        <span>{format(new Date(request.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
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
    </div>
  );
}
