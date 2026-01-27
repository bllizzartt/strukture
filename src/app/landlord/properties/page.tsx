'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/landlord/property-card';
import { useToast } from '@/hooks/use-toast';

interface Property {
  id: string;
  name: string;
  type: string;
  status: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  _count: {
    units: number;
  };
}

export default function PropertiesPage() {
  const { toast } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await fetch('/api/landlord/properties');
      const result = await response.json();

      if (result.success) {
        setProperties(result.data);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load properties',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/landlord/properties/${id}`, {
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

      setProperties(properties.filter((p) => p.id !== id));
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete property',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="text-muted-foreground">Manage your rental properties</p>
        </div>
        <Link href="/landlord/properties/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Button>
        </Link>
      </div>

      {/* Properties Grid */}
      {properties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Building2 className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No properties yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started by adding your first property
          </p>
          <Link href="/landlord/properties/new" className="mt-4">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Property
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
