'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyForm } from '@/components/landlord/property-form';
import { useToast } from '@/hooks/use-toast';

export default function EditPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [property, setProperty] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const propertyId = params.id as string;

  useEffect(() => {
    fetchProperty();
  }, [propertyId]);

  const fetchProperty = async () => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/landlord/properties/${propertyId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Property</h1>
          <p className="text-muted-foreground">{property.name}</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Property Details</CardTitle>
          <CardDescription>Update the property information</CardDescription>
        </CardHeader>
        <CardContent>
          <PropertyForm
            mode="edit"
            initialData={{
              id: property.id,
              name: property.name,
              type: property.type,
              status: property.status,
              addressLine1: property.addressLine1,
              addressLine2: property.addressLine2,
              city: property.city,
              state: property.state,
              zipCode: property.zipCode,
              country: property.country,
              yearBuilt: property.yearBuilt,
              totalUnits: property.totalUnits,
              parkingSpaces: property.parkingSpaces,
              amenities: property.amenities,
              licenseNumber: property.licenseNumber,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
