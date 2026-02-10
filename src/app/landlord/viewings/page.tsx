'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Eye,
  User,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Search,
  Phone,
  Mail,
  CalendarCheck,
  CalendarX,
  RotateCcw,
  MessageSquare,
  Plus,
  Trash2,
  CalendarPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// ==================== Interfaces ====================

interface ViewingRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string | null;
  preferredDate1: string;
  preferredDate2: string | null;
  preferredDate3: string | null;
  confirmedDate: string | null;
  status: string;
  landlordNotes: string | null;
  createdAt: string;
  property: {
    id: string;
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

interface ViewingSlot {
  id: string;
  propertyId: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  property: { id: string; name: string };
  _count: { bookings: number };
}

interface PropertyOption {
  id: string;
  name: string;
}

// ==================== Config ====================

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  REQUESTED: {
    label: 'Requested',
    color: 'bg-blue-100 text-blue-800',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  RESCHEDULED: {
    label: 'Rescheduled',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <RotateCcw className="h-3.5 w-3.5" />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-purple-100 text-purple-800',
    icon: <CalendarCheck className="h-3.5 w-3.5" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ==================== Main Component ====================

type Tab = 'requests' | 'slots';

export default function ViewingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('requests');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Property Viewings</h1>
        <p className="text-muted-foreground">
          Manage viewing requests and set available time slots
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab('requests')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'requests'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Eye className="h-4 w-4 inline mr-1.5" />
          Viewing Requests
        </button>
        <button
          onClick={() => setActiveTab('slots')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'slots'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Calendar className="h-4 w-4 inline mr-1.5" />
          Available Time Slots
        </button>
      </div>

      {activeTab === 'requests' && <ViewingRequestsTab />}
      {activeTab === 'slots' && <TimeSlotsTab />}
    </div>
  );
}

// ==================== Viewing Requests Tab ====================

function ViewingRequestsTab() {
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedViewing, setSelectedViewing] = useState<ViewingRequest | null>(null);
  const [actionType, setActionType] = useState<'confirm' | 'notes' | null>(null);
  const [confirmedDate, setConfirmedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchViewings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/landlord/viewings?${params}`);
      const result = await res.json();
      if (result.success) {
        setViewings(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch viewings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchViewings();
  }, [fetchViewings]);

  const filtered = viewings.filter((v) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.firstName.toLowerCase().includes(q) ||
      v.lastName.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.phone.includes(q) ||
      v.property.name.toLowerCase().includes(q)
    );
  });

  const counts = {
    all: viewings.length,
    REQUESTED: viewings.filter((v) => v.status === 'REQUESTED').length,
    CONFIRMED: viewings.filter((v) => v.status === 'CONFIRMED').length,
    COMPLETED: viewings.filter((v) => v.status === 'COMPLETED').length,
    CANCELLED: viewings.filter((v) => v.status === 'CANCELLED').length,
  };

  const updateViewing = async (id: string, data: Record<string, any>) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/landlord/viewings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setViewings((prev) =>
          prev.map((v) => (v.id === id ? { ...v, ...result.data } : v))
        );
        setSelectedViewing(null);
        setActionType(null);
        setConfirmedDate('');
        setNotes('');
      }
    } catch (error) {
      console.error('Failed to update viewing:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const openConfirmDialog = (viewing: ViewingRequest) => {
    setSelectedViewing(viewing);
    setActionType('confirm');
    if (viewing.preferredDate1) {
      const d = new Date(viewing.preferredDate1);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setConfirmedDate(local);
    }
    setNotes(viewing.landlordNotes || '');
  };

  const openNotesDialog = (viewing: ViewingRequest) => {
    setSelectedViewing(viewing);
    setActionType('notes');
    setNotes(viewing.landlordNotes || '');
  };

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'Total', count: counts.all },
          { key: 'REQUESTED', label: 'Pending', count: counts.REQUESTED },
          { key: 'CONFIRMED', label: 'Confirmed', count: counts.CONFIRMED },
          { key: 'COMPLETED', label: 'Completed', count: counts.COMPLETED },
          { key: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setStatusFilter(stat.key)}
            className={cn(
              'rounded-lg border p-3 text-left transition-colors',
              statusFilter === stat.key ? 'border-primary bg-primary/5' : 'hover:bg-muted'
            )}
          >
            <p className="text-2xl font-bold">{stat.count}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, or property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="REQUESTED">Requested</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="RESCHEDULED">Rescheduled</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Viewings List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Viewing Requests</h3>
            <p className="text-muted-foreground">
              {viewings.length === 0
                ? 'No viewing requests have been submitted yet.'
                : 'No viewings match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((viewing) => {
            const status = statusConfig[viewing.status] || statusConfig.REQUESTED;
            return (
              <Card key={viewing.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium">
                            {viewing.firstName} {viewing.lastName}
                          </p>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                              status.color
                            )}
                          >
                            {status.icon}
                            {status.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {viewing.email}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            {viewing.phone}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 mt-1.5 text-sm text-muted-foreground">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">
                            {viewing.property.name} &middot;{' '}
                            {viewing.property.addressLine1}, {viewing.property.city},{' '}
                            {viewing.property.state}
                          </span>
                        </div>

                        <div className="mt-2 space-y-0.5">
                          <div className="flex items-center gap-1.5 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-medium text-xs">Preferred:</span>
                            <span className="text-xs">
                              {formatDateTime(viewing.preferredDate1)}
                            </span>
                          </div>
                          {viewing.preferredDate2 && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0 invisible" />
                              <span className="text-xs">
                                2nd: {formatDateTime(viewing.preferredDate2)}
                              </span>
                            </div>
                          )}
                          {viewing.preferredDate3 && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5 shrink-0 invisible" />
                              <span className="text-xs">
                                3rd: {formatDateTime(viewing.preferredDate3)}
                              </span>
                            </div>
                          )}
                          {viewing.confirmedDate && (
                            <div className="flex items-center gap-1.5 text-sm text-green-700 font-medium mt-1">
                              <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                              <span className="text-xs">
                                Confirmed: {formatDateTime(viewing.confirmedDate)}
                              </span>
                            </div>
                          )}
                        </div>

                        {viewing.message && (
                          <div className="mt-2 text-xs text-muted-foreground bg-muted rounded-md p-2">
                            <MessageSquare className="h-3 w-3 inline mr-1" />
                            {viewing.message}
                          </div>
                        )}

                        {viewing.landlordNotes && (
                          <div className="mt-1.5 text-xs text-muted-foreground italic">
                            Notes: {viewing.landlordNotes}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2">
                          Submitted {formatDate(viewing.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 shrink-0">
                      {viewing.status === 'REQUESTED' && (
                        <>
                          <Button size="sm" onClick={() => openConfirmDialog(viewing)}>
                            <CalendarCheck className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateViewing(viewing.id, { status: 'CANCELLED' })}
                            disabled={isUpdating}
                          >
                            <CalendarX className="h-4 w-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      {viewing.status === 'CONFIRMED' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateViewing(viewing.id, { status: 'COMPLETED' })}
                            disabled={isUpdating}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openConfirmDialog(viewing)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Reschedule
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateViewing(viewing.id, { status: 'CANCELLED' })}
                            disabled={isUpdating}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                      {viewing.status === 'RESCHEDULED' && (
                        <>
                          <Button size="sm" onClick={() => openConfirmDialog(viewing)}>
                            <CalendarCheck className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateViewing(viewing.id, { status: 'CANCELLED' })}
                            disabled={isUpdating}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openNotesDialog(viewing)}>
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Notes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm / Reschedule Dialog */}
      <Dialog
        open={actionType === 'confirm' && !!selectedViewing}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedViewing(null);
            setActionType(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5" />
              {selectedViewing?.status === 'CONFIRMED'
                ? 'Reschedule Viewing'
                : 'Confirm Viewing'}
            </DialogTitle>
            <DialogDescription>
              Set the confirmed date and time for the viewing with{' '}
              <strong>
                {selectedViewing?.firstName} {selectedViewing?.lastName}
              </strong>{' '}
              at <strong>{selectedViewing?.property.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedViewing && (
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Visitor&apos;s preferred dates:
                </p>
                <p className="text-sm">1st: {formatDateTime(selectedViewing.preferredDate1)}</p>
                {selectedViewing.preferredDate2 && (
                  <p className="text-sm">2nd: {formatDateTime(selectedViewing.preferredDate2)}</p>
                )}
                {selectedViewing.preferredDate3 && (
                  <p className="text-sm">3rd: {formatDateTime(selectedViewing.preferredDate3)}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="confirmedDate">Confirmed Date & Time *</Label>
              <Input
                id="confirmedDate"
                type="datetime-local"
                value={confirmedDate}
                onChange={(e) => setConfirmedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-notes">Notes (Optional)</Label>
              <Textarea
                id="confirm-notes"
                rows={2}
                placeholder="e.g., Meet at the main entrance, bring ID..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!selectedViewing || !confirmedDate) return;
                updateViewing(selectedViewing.id, {
                  status:
                    selectedViewing.status === 'CONFIRMED' ? 'RESCHEDULED' : 'CONFIRMED',
                  confirmedDate,
                  landlordNotes: notes || undefined,
                });
              }}
              disabled={isUpdating || !confirmedDate}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : selectedViewing?.status === 'CONFIRMED' ? (
                'Reschedule Viewing'
              ) : (
                'Confirm Viewing'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog
        open={actionType === 'notes' && !!selectedViewing}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedViewing(null);
            setActionType(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Viewing Notes
            </DialogTitle>
            <DialogDescription>
              Add or update notes for the viewing with{' '}
              <strong>
                {selectedViewing?.firstName} {selectedViewing?.lastName}
              </strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              rows={4}
              placeholder="Internal notes about this viewing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => {
                if (!selectedViewing) return;
                updateViewing(selectedViewing.id, { landlordNotes: notes });
              }}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Notes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== Time Slots Tab ====================

function TimeSlotsTab() {
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [slots, setSlots] = useState<ViewingSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');

  // Add slot form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPropertyId, setAddPropertyId] = useState('');
  const [newSlots, setNewSlots] = useState([{ date: '', startTime: '', endTime: '' }]);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch('/api/landlord/properties');
      const result = await res.json();
      if (result.success) {
        setProperties(
          result.data.map((p: any) => ({ id: p.id, name: p.name }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  }, []);

  const fetchSlots = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedPropertyId !== 'all') params.set('propertyId', selectedPropertyId);
      const res = await fetch(`/api/landlord/viewings/slots?${params}`);
      const result = await res.json();
      if (result.success) {
        setSlots(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPropertyId]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const addSlotRow = () => {
    setNewSlots((prev) => [...prev, { date: '', startTime: '', endTime: '' }]);
  };

  const removeSlotRow = (index: number) => {
    setNewSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const updateSlotRow = (index: number, field: string, value: string) => {
    setNewSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  };

  const handleAddSlots = async () => {
    if (!addPropertyId) {
      setAddError('Please select a property');
      return;
    }

    const validSlots = newSlots
      .filter((s) => s.date && s.startTime && s.endTime)
      .map((s) => ({
        startTime: `${s.date}T${s.startTime}`,
        endTime: `${s.date}T${s.endTime}`,
      }));

    if (validSlots.length === 0) {
      setAddError('Please add at least one complete time slot');
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const res = await fetch('/api/landlord/viewings/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId: addPropertyId, slots: validSlots }),
      });
      const result = await res.json();
      if (result.success) {
        setShowAddForm(false);
        setNewSlots([{ date: '', startTime: '', endTime: '' }]);
        setAddPropertyId('');
        fetchSlots();
      } else {
        setAddError(result.error || 'Failed to create slots');
      }
    } catch {
      setAddError('Failed to create slots. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/landlord/viewings/slots/${slotId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        setSlots((prev) => prev.filter((s) => s.id !== slotId));
      }
    } catch (error) {
      console.error('Failed to delete slot:', error);
    }
  };

  // Group slots by property
  const slotsByProperty: Record<string, { propertyName: string; slots: ViewingSlot[] }> = {};
  const displaySlots =
    selectedPropertyId === 'all'
      ? slots
      : slots.filter((s) => s.propertyId === selectedPropertyId);

  for (const slot of displaySlots) {
    if (!slotsByProperty[slot.propertyId]) {
      slotsByProperty[slot.propertyId] = {
        propertyName: slot.property.name,
        slots: [],
      };
    }
    slotsByProperty[slot.propertyId].slots.push(slot);
  }

  // Separate future vs past slots
  const now = new Date();

  return (
    <>
      {/* Top Actions */}
      <div className="flex items-center justify-between">
        <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => setShowAddForm(true)}>
          <CalendarPlus className="h-4 w-4 mr-2" />
          Add Time Slots
        </Button>
      </div>

      {/* Add Slots Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CalendarPlus className="h-5 w-5" />
              Add Available Time Slots
            </CardTitle>
            <CardDescription>
              Set times when prospective tenants can schedule a viewing. Visitors will see these
              slots and pick one when requesting a viewing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Property *</Label>
              <Select value={addPropertyId} onValueChange={setAddPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addError && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg p-3">
                {addError}
              </div>
            )}

            <div className="space-y-3">
              <Label>Time Slots</Label>
              {newSlots.map((slot, index) => (
                <div key={index} className="flex items-end gap-3">
                  <div className="space-y-1 flex-1">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">Date</Label>
                    )}
                    <Input
                      type="date"
                      value={slot.date}
                      onChange={(e) => updateSlotRow(index, 'date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 w-[130px]">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">Start Time</Label>
                    )}
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlotRow(index, 'startTime', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1 w-[130px]">
                    {index === 0 && (
                      <Label className="text-xs text-muted-foreground">End Time</Label>
                    )}
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlotRow(index, 'endTime', e.target.value)}
                    />
                  </div>
                  {newSlots.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlotRow(index)}
                      className="shrink-0"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addSlotRow}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Another Slot
              </Button>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleAddSlots}
                disabled={isAdding}
                className="flex-1"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Time Slots'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setAddError(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Slots */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : Object.keys(slotsByProperty).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Time Slots Set</h3>
            <p className="text-muted-foreground mb-4">
              Add available viewing times so prospective tenants can schedule visits.
            </p>
            {!showAddForm && (
              <Button onClick={() => setShowAddForm(true)}>
                <CalendarPlus className="h-4 w-4 mr-2" />
                Add Time Slots
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(slotsByProperty).map(([propertyId, group]) => {
            const futureSlots = group.slots.filter(
              (s) => new Date(s.startTime) >= now && s.isActive
            );
            const pastSlots = group.slots.filter(
              (s) => new Date(s.startTime) < now || !s.isActive
            );

            return (
              <Card key={propertyId}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    {group.propertyName}
                  </CardTitle>
                  <CardDescription>
                    {futureSlots.length} upcoming slot{futureSlots.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {futureSlots.length > 0 && (
                    <div className="space-y-2">
                      {futureSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <div>
                              <p className="text-sm font-medium">
                                {formatDate(slot.startTime)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {slot._count.bookings > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {slot._count.bookings} booking{slot._count.bookings !== 1 ? 's' : ''}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSlot(slot.id)}
                              title="Remove slot"
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {pastSlots.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-muted-foreground mb-2">
                        Past / Inactive ({pastSlots.length})
                      </p>
                      <div className="space-y-1">
                        {pastSlots.slice(0, 3).map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between rounded-lg border border-dashed p-2 opacity-50"
                          >
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {formatDate(slot.startTime)} &middot;{' '}
                                {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                              </span>
                            </div>
                            {slot._count.bookings > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {slot._count.bookings} booking{slot._count.bookings !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        ))}
                        {pastSlots.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-6">
                            +{pastSlots.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
