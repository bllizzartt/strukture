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
  MapPin,
  CalendarCheck,
  CalendarX,
  RotateCcw,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export default function ViewingsPage() {
  const [viewings, setViewings] = useState<ViewingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Action modal state
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
    // Pre-fill with first preferred date
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Property Viewings</h1>
        <p className="text-muted-foreground">
          Manage viewing requests and schedule property tours
        </p>
      </div>

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
                    {/* Left: visitor info */}
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

                        {/* Preferred dates */}
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

                    {/* Right: actions */}
                    <div className="flex flex-row md:flex-col gap-2 shrink-0">
                      {viewing.status === 'REQUESTED' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openConfirmDialog(viewing)}
                          >
                            <CalendarCheck className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              updateViewing(viewing.id, { status: 'CANCELLED' })
                            }
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
                            onClick={() =>
                              updateViewing(viewing.id, { status: 'COMPLETED' })
                            }
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
                            onClick={() =>
                              updateViewing(viewing.id, { status: 'CANCELLED' })
                            }
                            disabled={isUpdating}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                      {viewing.status === 'RESCHEDULED' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => openConfirmDialog(viewing)}
                          >
                            <CalendarCheck className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              updateViewing(viewing.id, { status: 'CANCELLED' })
                            }
                            disabled={isUpdating}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                      {/* Notes button always available */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openNotesDialog(viewing)}
                      >
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
            {/* Show preferred dates for reference */}
            {selectedViewing && (
              <div className="rounded-lg bg-muted p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Visitor&apos;s preferred dates:
                </p>
                <p className="text-sm">
                  1st: {formatDateTime(selectedViewing.preferredDate1)}
                </p>
                {selectedViewing.preferredDate2 && (
                  <p className="text-sm">
                    2nd: {formatDateTime(selectedViewing.preferredDate2)}
                  </p>
                )}
                {selectedViewing.preferredDate3 && (
                  <p className="text-sm">
                    3rd: {formatDateTime(selectedViewing.preferredDate3)}
                  </p>
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
                    selectedViewing.status === 'CONFIRMED'
                      ? 'RESCHEDULED'
                      : 'CONFIRMED',
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
    </div>
  );
}
