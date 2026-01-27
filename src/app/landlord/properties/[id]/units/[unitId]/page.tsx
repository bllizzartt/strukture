'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

  const propertyId = params.id as string;
  const unitId = params.unitId as string;

  useEffect(() => {
    fetchUnit();
  }, [propertyId, unitId]);

  const fetchUnit = async () => {
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
  };

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

                <div className="border-t pt-4">
                  <Link href={`/landlord/leases/${activeLease.id}`}>
                    <Button variant="outline" className="w-full">
                      <FileText className="mr-2 h-4 w-4" />
                      View Lease Details
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-4">No active tenant</p>
                <Button variant="outline">
                  Add Tenant
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
