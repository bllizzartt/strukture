'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Wrench, Clock, Calendar, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  entryPermission: boolean;
  preferredTimes: string | null;
  photoUrls: string[];
  resolutionNotes: string | null;
  unit: {
    unitNumber: string;
    property: {
      name: string;
    };
  };
  updates: Array<{
    id: string;
    message: string;
    createdAt: string;
    previousStatus: string;
    newStatus: string;
    isPublic: boolean;
  }>;
}

const timeSlotLabels: Record<string, string> = {
  MORNING: 'Morning (8am - 12pm)',
  AFTERNOON: 'Afternoon (12pm - 5pm)',
  EVENING: 'Evening (5pm - 8pm)',
};

export default function TenantMaintenanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const requestId = params.id as string;

  const fetchRequest = useCallback(async () => {
    try {
      const response = await fetch(`/api/tenant/maintenance/${requestId}`);
      const result = await response.json();

      if (result.success) {
        setRequest(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Request not found',
        });
        router.push('/tenant/maintenance');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load maintenance request',
      });
    } finally {
      setIsLoading(false);
    }
  }, [requestId, toast, router]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!request) {
    return null;
  }

  // Filter to only show public updates
  const publicUpdates = request.updates.filter((update) => update.isPublic);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tenant/maintenance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{request.title}</h1>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                maintenancePriorityColors[request.priority]
              )}
            >
              {maintenancePriorityLabels[request.priority]}
            </span>
          </div>
          <p className="text-muted-foreground">
            {request.unit.property.name} - Unit {request.unit.unitNumber}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
            maintenanceStatusColors[request.status]
          )}
        >
          {maintenanceStatusLabels[request.status]}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{maintenanceCategoryLabels[request.category]}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="whitespace-pre-wrap">{request.description}</p>
              </div>

              {request.preferredTimes && (
                <div>
                  <p className="text-sm text-muted-foreground">Your Preferred Times</p>
                  <p>{request.preferredTimes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Entry Permission</p>
                <p className={request.entryPermission ? 'text-green-600' : 'text-amber-600'}>
                  {request.entryPermission
                    ? 'You have granted entry permission'
                    : 'Entry permission not granted - you will be contacted before entry'}
                </p>
              </div>

              {request.photoUrls && request.photoUrls.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {request.photoUrls.map((url, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={url}
                          alt={`Photo ${index + 1}`}
                          fill
                          className="rounded-lg object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Updates Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Updates
              </CardTitle>
              <CardDescription>Status updates from your landlord</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {publicUpdates.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No updates yet. Your landlord will update you soon.
                  </p>
                ) : (
                  publicUpdates.map((update) => (
                    <div key={update.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1 w-px bg-border" />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(update.createdAt), 'MMM d, yyyy h:mm a')}
                        </div>
                        <p className="mt-1">{update.message}</p>
                        {update.previousStatus !== update.newStatus && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Status updated to: {maintenanceStatusLabels[update.newStatus]}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {/* Created event */}
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground mt-2" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(request.createdAt), 'MMM d, yyyy h:mm a')}
                    </div>
                    <p className="mt-1">Request submitted</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Notes */}
          {request.status === 'COMPLETED' && request.resolutionNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Resolution Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{request.resolutionNotes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full px-4 py-2 text-sm font-medium',
                      maintenanceStatusColors[request.status]
                    )}
                  >
                    {maintenanceStatusLabels[request.status]}
                  </span>
                </div>

                {request.status === 'SUBMITTED' && (
                  <p className="text-center text-sm text-muted-foreground">
                    Your request has been received and is awaiting review.
                  </p>
                )}
                {request.status === 'ACKNOWLEDGED' && (
                  <p className="text-center text-sm text-muted-foreground">
                    Your landlord has acknowledged your request and will schedule repairs soon.
                  </p>
                )}
                {request.status === 'SCHEDULED' && (
                  <p className="text-center text-sm text-muted-foreground">
                    Repairs have been scheduled. Please see the scheduled date below.
                  </p>
                )}
                {request.status === 'IN_PROGRESS' && (
                  <p className="text-center text-sm text-muted-foreground">
                    Work is currently in progress on your request.
                  </p>
                )}
                {request.status === 'COMPLETED' && (
                  <p className="text-center text-sm text-muted-foreground">
                    Your maintenance request has been resolved.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Date */}
          {request.scheduledDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Scheduled Visit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-lg">
                  {format(new Date(request.scheduledDate), 'EEEE, MMMM d, yyyy')}
                </p>
                {request.scheduledTimeSlot && (
                  <p className="text-muted-foreground">
                    {timeSlotLabels[request.scheduledTimeSlot] || request.scheduledTimeSlot}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {request.entryPermission
                    ? 'You have granted entry permission.'
                    : 'Please ensure someone is available to provide access.'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{request.unit.property.name}</p>
              <p className="text-sm text-muted-foreground">Unit {request.unit.unitNumber}</p>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Submitted</span>
                <span>{format(new Date(request.createdAt), 'MMM d, yyyy')}</span>
              </div>
              {request.acknowledgedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acknowledged</span>
                  <span>{format(new Date(request.acknowledgedAt), 'MMM d, yyyy')}</span>
                </div>
              )}
              {request.scheduledDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scheduled</span>
                  <span>{format(new Date(request.scheduledDate), 'MMM d, yyyy')}</span>
                </div>
              )}
              {request.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>{format(new Date(request.completedAt), 'MMM d, yyyy')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
