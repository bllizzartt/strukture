'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UnitForm } from '@/components/landlord/unit-form';
import { useToast } from '@/hooks/use-toast';

export default function EditUnitPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [unit, setUnit] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/landlord/properties/${propertyId}/units/${unitId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Unit</h1>
          <p className="text-muted-foreground">Unit {unit.unitNumber}</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Details</CardTitle>
          <CardDescription>Update the unit information</CardDescription>
        </CardHeader>
        <CardContent>
          <UnitForm
            propertyId={propertyId}
            mode="edit"
            initialData={{
              id: unit.id,
              unitNumber: unit.unitNumber,
              status: unit.status,
              bedrooms: unit.bedrooms,
              bathrooms: unit.bathrooms,
              squareFeet: unit.squareFeet,
              floor: unit.floor,
              monthlyRent: typeof unit.monthlyRent === 'string' ? parseFloat(unit.monthlyRent) : unit.monthlyRent,
              depositAmount: unit.depositAmount
                ? typeof unit.depositAmount === 'string'
                  ? parseFloat(unit.depositAmount)
                  : unit.depositAmount
                : 0,
              features: unit.features || [],
              petPolicy: unit.petPolicy,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
