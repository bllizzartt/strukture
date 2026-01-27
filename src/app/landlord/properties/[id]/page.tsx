'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Car,
  Home,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitCard } from '@/components/landlord/unit-card';
import { propertyTypeLabels, propertyStatusLabels } from '@/lib/validators/property';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Property {
  id: string;
  name: string;
  type: string;
  status: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  yearBuilt?: number;
  totalUnits: number;
  parkingSpaces?: number;
  amenities: string[];
  licenseNumber?: string;
  licenseExpiry?: string;
  units: Array<{
    id: string;
    unitNumber: string;
    status: string;
    bedrooms: number;
    bathrooms: number;
    squareFeet?: number;
    monthlyRent: number;
    leases?: Array<{
      tenant: {
        firstName: string;
        lastName: string;
      };
    }>;
  }>;
  _count: {
    units: number;
  };
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const propertyId = params.id as string;

  const fetchProperty = useCallback(async () => {
    try {
      const response = await fetch(`/api/landlord/properties/${propertyId}`);
      const result = await response.json();

      if (result.success) {
        setProperty(result.data);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Property not found',
        });
        router.push('/landlord/properties');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load property',
      });
    } finally {
      setIsLoading(false);
    }
  }, [propertyId, toast, router]);

  useEffect(() => {
    fetchProperty();
  }, [fetchProperty]);

  const handleDeleteProperty = async () => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/landlord/properties/${propertyId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete property',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Property deleted successfully',
      });

      router.push('/landlord/properties');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete property',
      });
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm('Are you sure you want to delete this unit? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/landlord/properties/${propertyId}/units/${unitId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to delete unit',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Unit deleted successfully',
      });

      fetchProperty();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete unit',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!property) {
    return null;
  }

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    UNDER_RENOVATION: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/landlord/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{property.name}</h1>
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  statusColors[property.status as keyof typeof statusColors] ||
                    'bg-gray-100 text-gray-800'
                )}
              >
                {propertyStatusLabels[property.status as keyof typeof propertyStatusLabels] ||
                  property.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {propertyTypeLabels[property.type as keyof typeof propertyTypeLabels] ||
                property.type}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/landlord/properties/${propertyId}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" onClick={handleDeleteProperty}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Property Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Property Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Address</p>
                <p className="text-muted-foreground">
                  {property.addressLine1}
                  {property.addressLine2 && <>, {property.addressLine2}</>}
                  <br />
                  {property.city}, {property.state} {property.zipCode}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {property.yearBuilt && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Year Built</p>
                    <p className="font-medium">{property.yearBuilt}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Home className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Units</p>
                  <p className="font-medium">{property._count.units}</p>
                </div>
              </div>

              {property.parkingSpaces !== null && property.parkingSpaces !== undefined && (
                <div className="flex items-center gap-3">
                  <Car className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Parking</p>
                    <p className="font-medium">{property.parkingSpaces} spaces</p>
                  </div>
                </div>
              )}
            </div>

            {property.licenseNumber && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">License Number</p>
                <p className="font-medium">{property.licenseNumber}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Units</span>
              <span className="font-medium">{property._count.units}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vacant</span>
              <span className="font-medium">
                {property.units.filter((u) => u.status === 'VACANT').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Occupied</span>
              <span className="font-medium">
                {property.units.filter((u) => u.status === 'OCCUPIED').length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Units Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Units</CardTitle>
            <CardDescription>Manage units in this property</CardDescription>
          </div>
          <Link href={`/landlord/properties/${propertyId}/units/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {property.units.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {property.units.map((unit) => (
                <UnitCard
                  key={unit.id}
                  propertyId={propertyId}
                  unit={unit}
                  onDelete={handleDeleteUnit}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
              <Home className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No units yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add units to start managing tenants
              </p>
              <Link href={`/landlord/properties/${propertyId}/units/new`} className="mt-4">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Unit
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
