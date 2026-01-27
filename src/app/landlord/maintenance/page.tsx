'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Wrench, AlertTriangle, Clock, CheckCircle, User } from 'lucide-react';
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
import {
  maintenanceStatusLabels,
  maintenanceStatusColors,
  maintenancePriorityLabels,
  maintenancePriorityColors,
  maintenanceCategoryLabels,
  maintenanceStatuses,
  maintenancePriorities,
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
  entryPermission: boolean;
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
  updates: Array<{
    id: string;
    message: string;
    createdAt: string;
    newStatus: string;
  }>;
}

interface Property {
  id: string;
  name: string;
}

export default function LandlordMaintenancePage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  const fetchRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/landlord/maintenance');
      const result = await response.json();
      if (result.success) {
        setRequests(result.data);

        // Extract unique properties
        const uniqueProperties = new Map<string, Property>();
        result.data.forEach((request: MaintenanceRequest) => {
          const prop = request.unit.property;
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
        description: 'Failed to load maintenance requests',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = requests.filter((request) => {
    if (selectedStatus !== 'all' && request.status !== selectedStatus) {
      return false;
    }
    if (selectedPriority !== 'all' && request.priority !== selectedPriority) {
      return false;
    }
    if (selectedProperty !== 'all' && request.unit.property.id !== selectedProperty) {
      return false;
    }
    return true;
  });

  const openCount = requests.filter(
    (r) => !['COMPLETED', 'CANCELLED'].includes(r.status)
  ).length;
  const emergencyCount = requests.filter(
    (r) => r.priority === 'EMERGENCY' && !['COMPLETED', 'CANCELLED'].includes(r.status)
  ).length;
  const awaitingCount = requests.filter((r) => r.status === 'SUBMITTED').length;

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
        <h1 className="text-3xl font-bold">Maintenance</h1>
        <p className="text-muted-foreground">Manage repair requests from tenants</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openCount}</div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card className={emergencyCount > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emergency</CardTitle>
            <AlertTriangle className={cn('h-4 w-4', emergencyCount > 0 ? 'text-red-600' : 'text-muted-foreground')} />
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', emergencyCount > 0 && 'text-red-600')}>
              {emergencyCount}
            </div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Response</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{awaitingCount}</div>
            <p className="text-xs text-muted-foreground">New requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {requests.filter((r) => r.status === 'COMPLETED').length}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
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
                  {maintenanceStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {maintenanceStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {maintenancePriorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {maintenancePriorityLabels[priority]}
                    </SelectItem>
                  ))}
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

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No maintenance requests</p>
              <p className="text-sm text-muted-foreground">
                Requests from your tenants will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <Link
                  key={request.id}
                  href={`/landlord/maintenance/${request.id}`}
                  className="block"
                >
                  <div
                    className={cn(
                      'flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors',
                      request.priority === 'EMERGENCY' && 'border-red-200 bg-red-50'
                    )}
                  >
                    <div className="space-y-2">
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
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {request.tenant.firstName} {request.tenant.lastName}
                        </span>
                        <span>•</span>
                        <span>
                          {request.unit.property.name} - Unit {request.unit.unitNumber}
                        </span>
                        <span>•</span>
                        <span>{maintenanceCategoryLabels[request.category]}</span>
                        <span>•</span>
                        <span>{format(new Date(request.createdAt), 'MMM d, yyyy')}</span>
                      </div>
                      {request.entryPermission && (
                        <span className="inline-flex items-center text-xs text-green-600">
                          Entry permitted
                        </span>
                      )}
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
