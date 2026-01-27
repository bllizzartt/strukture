'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Wrench,
  User,
  Building2,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
  scheduledDate: string | null;
  scheduledTimeSlot: string | null;
  entryPermission: boolean;
  preferredTimes: string | null;
  photoUrls: string[];
  estimatedCost: number | null;
  actualCost: number | null;
  vendorName: string | null;
  vendorPhone: string | null;
  resolutionNotes: string | null;
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
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  updates: Array<{
    id: string;
    message: string;
    createdAt: string;
    previousStatus: string;
    newStatus: string;
    isPublic: boolean;
  }>;
}

export default function MaintenanceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);

  // Form states
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTimeSlot, setScheduledTimeSlot] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateIsPublic, setUpdateIsPublic] = useState(true);

  const requestId = params.id as string;

  const fetchRequest = useCallback(async () => {
    try {
      const response = await fetch(`/api/landlord/maintenance/${requestId}`);
      const result = await response.json();

      if (result.success) {
        setRequest(result.data);
        // Initialize form values
        setNewStatus(result.data.status);
        setNewPriority(result.data.priority);
        setScheduledDate(result.data.scheduledDate?.split('T')[0] || '');
        setScheduledTimeSlot(result.data.scheduledTimeSlot || '');
        setEstimatedCost(result.data.estimatedCost?.toString() || '');
        setActualCost(result.data.actualCost?.toString() || '');
        setVendorName(result.data.vendorName || '');
        setVendorPhone(result.data.vendorPhone || '');
        setResolutionNotes(result.data.resolutionNotes || '');
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Request not found',
        });
        router.push('/landlord/maintenance');
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

  const handleUpdate = async () => {
    setIsUpdating(true);

    try {
      const updateData: Record<string, any> = {};

      if (newStatus !== request?.status) updateData.status = newStatus;
      if (newPriority !== request?.priority) updateData.priority = newPriority;
      if (scheduledDate) updateData.scheduledDate = scheduledDate;
      if (scheduledTimeSlot) updateData.scheduledTimeSlot = scheduledTimeSlot;
      if (estimatedCost) updateData.estimatedCost = parseFloat(estimatedCost);
      if (actualCost) updateData.actualCost = parseFloat(actualCost);
      if (vendorName) updateData.vendorName = vendorName;
      if (vendorPhone) updateData.vendorPhone = vendorPhone;
      if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;

      const response = await fetch(`/api/landlord/maintenance/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Request updated successfully',
        });
        fetchRequest();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update request',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddUpdate = async () => {
    if (!updateMessage.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a message',
      });
      return;
    }

    setIsAddingUpdate(true);

    try {
      const response = await fetch(`/api/landlord/maintenance/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: updateMessage,
          isPublic: updateIsPublic,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Update added successfully',
        });
        setUpdateMessage('');
        fetchRequest();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to add update',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong',
      });
    } finally {
      setIsAddingUpdate(false);
    }
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/landlord/maintenance">
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
                <Label className="text-muted-foreground">Category</Label>
                <p className="font-medium">{maintenanceCategoryLabels[request.category]}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="whitespace-pre-wrap">{request.description}</p>
              </div>

              {request.preferredTimes && (
                <div>
                  <Label className="text-muted-foreground">Preferred Times</Label>
                  <p>{request.preferredTimes}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground">Entry Permission:</Label>
                <span className={request.entryPermission ? 'text-green-600' : 'text-red-600'}>
                  {request.entryPermission ? 'Yes, entry permitted' : 'No, contact tenant first'}
                </span>
              </div>

              {request.photoUrls && request.photoUrls.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Photos</Label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {request.photoUrls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Photo ${index + 1}`}
                        className="rounded-lg object-cover aspect-square"
                      />
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
              <CardDescription>History of status changes and comments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Add update form */}
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add an update or note..."
                    value={updateMessage}
                    onChange={(e) => setUpdateMessage(e.target.value)}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={updateIsPublic}
                        onChange={(e) => setUpdateIsPublic(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Visible to tenant
                    </label>
                    <Button
                      size="sm"
                      onClick={handleAddUpdate}
                      disabled={isAddingUpdate || !updateMessage.trim()}
                    >
                      {isAddingUpdate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add Update
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Timeline */}
                <div className="space-y-4">
                  {request.updates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No updates yet</p>
                  ) : (
                    request.updates.map((update) => (
                      <div key={update.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                          <div className="flex-1 w-px bg-border" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{format(new Date(update.createdAt), 'MMM d, yyyy h:mm a')}</span>
                            {!update.isPublic && (
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                Internal
                              </span>
                            )}
                          </div>
                          <p className="mt-1">{update.message}</p>
                          {update.previousStatus !== update.newStatus && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Status: {maintenanceStatusLabels[update.previousStatus]} →{' '}
                              {maintenanceStatusLabels[update.newStatus]}
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
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tenant Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Tenant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-medium">
                {request.tenant.firstName} {request.tenant.lastName}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <a href={`mailto:${request.tenant.email}`} className="hover:underline">
                  {request.tenant.email}
                </a>
              </div>
              {request.tenant.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${request.tenant.phone}`} className="hover:underline">
                    {request.tenant.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Property Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{request.unit.property.name}</p>
              <p className="text-sm text-muted-foreground">Unit {request.unit.unitNumber}</p>
              <Link
                href={`/landlord/properties/${request.unit.property.id}`}
                className="text-sm text-primary hover:underline"
              >
                View Property
              </Link>
            </CardContent>
          </Card>

          {/* Management */}
          <Card>
            <CardHeader>
              <CardTitle>Manage Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {maintenanceStatusLabels[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenancePriorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {maintenancePriorityLabels[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Scheduled Date
                </Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Time Slot</Label>
                <Select value={scheduledTimeSlot} onValueChange={setScheduledTimeSlot}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time slot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MORNING">Morning (8am - 12pm)</SelectItem>
                    <SelectItem value="AFTERNOON">Afternoon (12pm - 5pm)</SelectItem>
                    <SelectItem value="EVENING">Evening (5pm - 8pm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Vendor Name</Label>
                <Input
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Enter vendor name"
                />
              </div>

              <div className="space-y-2">
                <Label>Vendor Phone</Label>
                <Input
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  placeholder="Enter vendor phone"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Estimated Cost
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Actual Cost
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Notes about how the issue was resolved..."
                  rows={3}
                />
              </div>

              <Button className="w-full" onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
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
