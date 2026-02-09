'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Trash2,
  Bed,
  Bath,
  Square,
  DollarSign,
  User,
  Calendar,
  FileText,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { unitStatusLabels } from '@/lib/validators/property';
import { formatCurrency, cn } from '@/lib/utils';

export default function UnitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [unit, setUnit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRemovingTenant, setIsRemovingTenant] = useState(false);
  const [isAddTenantOpen, setIsAddTenantOpen] = useState(false);
  const [isCreatingLease, setIsCreatingLease] = useState(false);
  const [leaseForm, setLeaseForm] = useState({
    tenantEmail: '',
    startDate: '',
    endDate: '',
    monthlyRent: '',
    depositAmount: '',
    lateFee: '',
    gracePeriodDays: '5',
    rentDueDay: '1',
    petDeposit: '',
    petRent: '',
    additionalTerms: '',
  });

  const propertyId = params.id as string;
  const unitId = params.unitId as string;

  const fetchUnit = useCallback(async () => {
    try {
      const response = await fetch(`/api/landlord/properties/${propertyId}/units/${unitId}`);
      const result = await response.json();

      if (result.success) {
        setUnit(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Unit not found',
        });
        router.push(`/landlord/properties/${propertyId}`);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load unit',
      });
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, unitId, toast, router]);

  useEffect(() => {
    fetchUnit();
  }, [fetchUnit]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/landlord/properties/${propertyId}/units/${unitId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Unit deleted successfully',
        });
        router.push(`/landlord/properties/${propertyId}`);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete unit',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete unit',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveTenant = async () => {
    const lease = unit?.leases?.[0];
    if (!lease) return;
    setIsRemovingTenant(true);
    try {
      const response = await fetch(`/api/landlord/leases/${lease.id}/terminate`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Tenant Removed',
          description: 'Lease terminated and unit is now vacant.',
        });
        fetchUnit();
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to remove tenant',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove tenant',
      });
    } finally {
      setIsRemovingTenant(false);
    }
  };

  // Pre-fill rent/deposit from unit when it loads
  useEffect(() => {
    if (unit) {
      const r = typeof unit.monthlyRent === 'string' ? unit.monthlyRent : String(unit.monthlyRent);
      const d = typeof unit.depositAmount === 'string' ? unit.depositAmount : String(unit.depositAmount);
      setLeaseForm((prev) => ({
        ...prev,
        monthlyRent: r,
        depositAmount: d,
      }));
    }
  }, [unit]);

  const handleCreateLease = async () => {
    if (!leaseForm.tenantEmail || !leaseForm.startDate || !leaseForm.endDate) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please fill in tenant email, start date, and end date',
      });
      return;
    }

    setIsCreatingLease(true);
    try {
      const response = await fetch('/api/landlord/leases/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId,
          tenantEmail: leaseForm.tenantEmail,
          startDate: leaseForm.startDate,
          endDate: leaseForm.endDate,
          monthlyRent: parseFloat(leaseForm.monthlyRent),
          depositAmount: parseFloat(leaseForm.depositAmount),
          lateFee: leaseForm.lateFee ? parseFloat(leaseForm.lateFee) : null,
          gracePeriodDays: parseInt(leaseForm.gracePeriodDays),
          rentDueDay: parseInt(leaseForm.rentDueDay),
          petDeposit: leaseForm.petDeposit ? parseFloat(leaseForm.petDeposit) : null,
          petRent: leaseForm.petRent ? parseFloat(leaseForm.petRent) : null,
          additionalTerms: leaseForm.additionalTerms || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Lease Created',
          description: `Invite sent to ${leaseForm.tenantEmail}. They'll receive an email to review and sign the lease.`,
        });
        setIsAddTenantOpen(false);
        fetchUnit(); // Refresh the page data
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to create lease',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create lease',
      });
    } finally {
      setIsCreatingLease(false);
    }
  };

  const statusColors = {
    VACANT: 'bg-green-100 text-green-800',
    OCCUPIED: 'bg-blue-100 text-blue-800',
    UNDER_MAINTENANCE: 'bg-yellow-100 text-yellow-800',
    RESERVED: 'bg-purple-100 text-purple-800',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!unit) {
    return null;
  }

  const rent = typeof unit.monthlyRent === 'string' ? parseFloat(unit.monthlyRent) : unit.monthlyRent;
  const deposit = typeof unit.depositAmount === 'string' ? parseFloat(unit.depositAmount) : unit.depositAmount;
  const activeLease = unit.leases?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/landlord/properties/${propertyId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Unit {unit.unitNumber}</h1>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  statusColors[unit.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
                )}
              >
                {unitStatusLabels[unit.status as keyof typeof unitStatusLabels] || unit.status}
              </span>
            </div>
            <p className="text-muted-foreground">{unit.property?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/landlord/properties/${propertyId}/units/${unitId}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete Unit {unit.unitNumber}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Unit Details */}
        <Card>
          <CardHeader>
            <CardTitle>Unit Details</CardTitle>
            <CardDescription>Physical characteristics and rent information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Bed className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Bedrooms</p>
                  <p className="font-medium">{unit.bedrooms}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Bathrooms</p>
                  <p className="font-medium">{unit.bathrooms}</p>
                </div>
              </div>
              {unit.squareFeet && (
                <div className="flex items-center gap-2">
                  <Square className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Square Feet</p>
                    <p className="font-medium">{unit.squareFeet}</p>
                  </div>
                </div>
              )}
              {unit.floor && (
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Floor</p>
                    <p className="font-medium">{unit.floor}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="text-lg font-semibold text-primary">{formatCurrency(rent)}</p>
                  </div>
                </div>
                {deposit && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Security Deposit</p>
                      <p className="font-medium">{formatCurrency(deposit)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {unit.features && unit.features.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Features</p>
                <div className="flex flex-wrap gap-2">
                  {unit.features.map((feature: string) => (
                    <span
                      key={feature}
                      className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {unit.petPolicy && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-2">Pet Policy</p>
                <p className="text-sm">{unit.petPolicy}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Tenant */}
        <Card>
          <CardHeader>
            <CardTitle>Current Tenant</CardTitle>
            <CardDescription>Active lease information</CardDescription>
          </CardHeader>
          <CardContent>
            {activeLease ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {activeLease.tenant.firstName} {activeLease.tenant.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{activeLease.tenant.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Lease Start</p>
                      <p className="text-sm font-medium">
                        {new Date(activeLease.startDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Lease End</p>
                      <p className="text-sm font-medium">
                        {new Date(activeLease.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <Link href={`/landlord/leases/${activeLease.id}`}>
                    <Button variant="outline" className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      View Lease Details
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full" disabled={isRemovingTenant}>
                        {isRemovingTenant ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Remove Tenant
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove Tenant</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will terminate the lease for {activeLease.tenant.firstName} {activeLease.tenant.lastName} and
                          set the unit back to vacant. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveTenant} className="bg-destructive text-destructive-foreground">
                          Remove Tenant
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No active tenant</p>
                <Dialog open={isAddTenantOpen} onOpenChange={setIsAddTenantOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Add Tenant</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Lease & Invite Tenant</DialogTitle>
                      <DialogDescription>
                        Set the lease terms below. The tenant will receive an email to review and sign the lease.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="tenantEmail">Tenant Email *</Label>
                        <Input
                          id="tenantEmail"
                          type="email"
                          placeholder="tenant@example.com"
                          value={leaseForm.tenantEmail}
                          onChange={(e) => setLeaseForm({ ...leaseForm, tenantEmail: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="startDate">Start Date *</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={leaseForm.startDate}
                            onChange={(e) => setLeaseForm({ ...leaseForm, startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="endDate">End Date *</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={leaseForm.endDate}
                            onChange={(e) => setLeaseForm({ ...leaseForm, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="monthlyRent">Monthly Rent ($)</Label>
                          <Input
                            id="monthlyRent"
                            type="number"
                            step="0.01"
                            value={leaseForm.monthlyRent}
                            onChange={(e) => setLeaseForm({ ...leaseForm, monthlyRent: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="depositAmount">Security Deposit ($)</Label>
                          <Input
                            id="depositAmount"
                            type="number"
                            step="0.01"
                            value={leaseForm.depositAmount}
                            onChange={(e) => setLeaseForm({ ...leaseForm, depositAmount: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="rentDueDay">Rent Due Day</Label>
                          <Input
                            id="rentDueDay"
                            type="number"
                            min="1"
                            max="28"
                            value={leaseForm.rentDueDay}
                            onChange={(e) => setLeaseForm({ ...leaseForm, rentDueDay: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="gracePeriodDays">Grace Period (days)</Label>
                          <Input
                            id="gracePeriodDays"
                            type="number"
                            min="0"
                            value={leaseForm.gracePeriodDays}
                            onChange={(e) => setLeaseForm({ ...leaseForm, gracePeriodDays: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lateFee">Late Fee ($)</Label>
                          <Input
                            id="lateFee"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={leaseForm.lateFee}
                            onChange={(e) => setLeaseForm({ ...leaseForm, lateFee: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="petDeposit">Pet Deposit ($)</Label>
                          <Input
                            id="petDeposit"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={leaseForm.petDeposit}
                            onChange={(e) => setLeaseForm({ ...leaseForm, petDeposit: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="petRent">Pet Rent ($/mo)</Label>
                          <Input
                            id="petRent"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={leaseForm.petRent}
                            onChange={(e) => setLeaseForm({ ...leaseForm, petRent: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="additionalTerms">Additional Terms</Label>
                        <Textarea
                          id="additionalTerms"
                          placeholder="Any additional lease terms or conditions..."
                          rows={3}
                          value={leaseForm.additionalTerms}
                          onChange={(e) => setLeaseForm({ ...leaseForm, additionalTerms: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddTenantOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateLease} disabled={isCreatingLease}>
                        {isCreatingLease ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Create & Send Invite
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
