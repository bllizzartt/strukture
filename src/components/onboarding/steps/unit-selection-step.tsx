'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Bed, Bath, Square, DollarSign, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import {
  leaseSelectionSchema,
  leaseTermLabels,
  type LeaseSelectionInput,
} from '@/lib/validators/onboarding';
import { useOnboarding } from '../onboarding-context';
import { formatCurrency, cn } from '@/lib/utils';

interface AvailableUnit {
  id: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  monthlyRent: string | number;
  depositAmount: string | number;
  features: string[];
  property: {
    id: string;
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    zipCode: string;
    type: string;
    amenities: string[];
  };
}

const leaseTerms = ['6', '12', '18', '24'] as const;

export function UnitSelectionStep() {
  const { data, updateData, setCurrentStep } = useOnboarding();
  const [units, setUnits] = useState<AvailableUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeaseSelectionInput>({
    resolver: zodResolver(leaseSelectionSchema),
    defaultValues: {
      unitId: data.unitId || '',
      moveInDate: data.moveInDate || '',
      leaseTerm: data.leaseTerm || '12',
    },
  });

  const selectedUnitId = watch('unitId');
  const selectedLeaseTerm = watch('leaseTerm');
  const selectedUnit = units.find((u) => u.id === selectedUnitId);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/onboarding/available-units');
      const result = await response.json();
      if (result.success) {
        setUnits(result.data);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = (formData: LeaseSelectionInput) => {
    updateData(formData);
    setCurrentStep(4);
  };

  const handleBack = () => {
    setCurrentStep(2);
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Select Your Unit</h2>
        <p className="text-muted-foreground">
          Choose an available unit and your desired lease terms.
        </p>
      </div>

      {units.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No units are currently available.</p>
            <p className="text-sm text-muted-foreground">
              Please check back later or contact us for assistance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            <Label>Available Units *</Label>
            <div className="grid gap-4 md:grid-cols-2">
              {units.map((unit) => {
                const rent =
                  typeof unit.monthlyRent === 'string'
                    ? parseFloat(unit.monthlyRent)
                    : unit.monthlyRent;

                return (
                  <Card
                    key={unit.id}
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedUnitId === unit.id
                        ? 'ring-2 ring-primary'
                        : 'hover:shadow-md'
                    )}
                    onClick={() => setValue('unitId', unit.id)}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">
                              {unit.property.name} - Unit {unit.unitNumber}
                            </h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>
                                {unit.property.addressLine1}, {unit.property.city},{' '}
                                {unit.property.state}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {formatCurrency(rent)}
                            </div>
                            <div className="text-xs text-muted-foreground">per month</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Bed className="h-4 w-4 text-muted-foreground" />
                            <span>{unit.bedrooms} bed</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Bath className="h-4 w-4 text-muted-foreground" />
                            <span>{unit.bathrooms} bath</span>
                          </div>
                          {unit.squareFeet && (
                            <div className="flex items-center gap-1">
                              <Square className="h-4 w-4 text-muted-foreground" />
                              <span>{unit.squareFeet} sqft</span>
                            </div>
                          )}
                        </div>

                        {unit.features.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {unit.features.slice(0, 3).map((feature) => (
                              <span
                                key={feature}
                                className="rounded-full bg-secondary px-2 py-0.5 text-xs"
                              >
                                {feature}
                              </span>
                            ))}
                            {unit.features.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{unit.features.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {errors.unitId && (
              <p className="text-sm text-destructive">{errors.unitId.message}</p>
            )}
          </div>

          {selectedUnit && (
            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  <span>
                    Security Deposit:{' '}
                    <strong>
                      {formatCurrency(
                        typeof selectedUnit.depositAmount === 'string'
                          ? parseFloat(selectedUnit.depositAmount)
                          : selectedUnit.depositAmount
                      )}
                    </strong>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="moveInDate">Desired Move-in Date *</Label>
              <Input
                id="moveInDate"
                type="date"
                min={getMinDate()}
                {...register('moveInDate')}
              />
              {errors.moveInDate && (
                <p className="text-sm text-destructive">{errors.moveInDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseTerm">Lease Term *</Label>
              <Select
                value={selectedLeaseTerm}
                onValueChange={(value) =>
                  setValue('leaseTerm', value as (typeof leaseTerms)[number])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lease term" />
                </SelectTrigger>
                <SelectContent>
                  {leaseTerms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {leaseTermLabels[term]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leaseTerm && (
                <p className="text-sm text-destructive">{errors.leaseTerm.message}</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button type="submit" disabled={units.length === 0}>
          Continue
        </Button>
      </div>
    </form>
  );
}
