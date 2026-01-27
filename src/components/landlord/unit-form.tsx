'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  createUnitSchema,
  unitStatuses,
  unitStatusLabels,
  type CreateUnitInput,
} from '@/lib/validators/property';
import { useToast } from '@/hooks/use-toast';

interface UnitFormProps {
  propertyId: string;
  initialData?: Partial<CreateUnitInput> & { id?: string };
  mode: 'create' | 'edit';
}

export function UnitForm({ propertyId, initialData, mode }: UnitFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUnitInput>({
    resolver: zodResolver(createUnitSchema),
    defaultValues: {
      unitNumber: initialData?.unitNumber || '',
      status: initialData?.status || 'VACANT',
      bedrooms: initialData?.bedrooms || 1,
      bathrooms: initialData?.bathrooms || 1,
      squareFeet: initialData?.squareFeet,
      floor: initialData?.floor,
      monthlyRent: initialData?.monthlyRent || 0,
      depositAmount: initialData?.depositAmount || 0,
      features: initialData?.features || [],
      petPolicy: initialData?.petPolicy || '',
    },
  });

  const selectedStatus = watch('status');

  const onSubmit = async (data: CreateUnitInput) => {
    setIsLoading(true);

    try {
      const url =
        mode === 'create'
          ? `/api/landlord/properties/${propertyId}/units`
          : `/api/landlord/properties/${propertyId}/units/${initialData?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to save unit',
        });
        return;
      }

      toast({
        title: 'Success',
        description:
          mode === 'create' ? 'Unit created successfully' : 'Unit updated successfully',
      });

      router.push(`/landlord/properties/${propertyId}`);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Unit Information</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="unitNumber">Unit Number *</Label>
            <Input
              id="unitNumber"
              placeholder="e.g., 101, A1, Ground Floor"
              {...register('unitNumber')}
              disabled={isLoading}
            />
            {errors.unitNumber && (
              <p className="text-sm text-destructive">{errors.unitNumber.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setValue('status', value as (typeof unitStatuses)[number])
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {unitStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {unitStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="bedrooms">Bedrooms *</Label>
            <Input
              id="bedrooms"
              type="number"
              min="0"
              {...register('bedrooms', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.bedrooms && (
              <p className="text-sm text-destructive">{errors.bedrooms.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bathrooms">Bathrooms *</Label>
            <Input
              id="bathrooms"
              type="number"
              min="0"
              step="0.5"
              {...register('bathrooms', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.bathrooms && (
              <p className="text-sm text-destructive">{errors.bathrooms.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="squareFeet">Square Feet</Label>
            <Input
              id="squareFeet"
              type="number"
              min="1"
              {...register('squareFeet', { valueAsNumber: true })}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="floor">Floor</Label>
          <Input
            id="floor"
            type="number"
            placeholder="e.g., 1, 2, -1 for basement"
            {...register('floor', { valueAsNumber: true })}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Rental Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Rental Details</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="monthlyRent">Monthly Rent *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="monthlyRent"
                type="number"
                min="0"
                step="0.01"
                className="pl-7"
                {...register('monthlyRent', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
            {errors.monthlyRent && (
              <p className="text-sm text-destructive">{errors.monthlyRent.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="depositAmount">Security Deposit *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="depositAmount"
                type="number"
                min="0"
                step="0.01"
                className="pl-7"
                {...register('depositAmount', { valueAsNumber: true })}
                disabled={isLoading}
              />
            </div>
            {errors.depositAmount && (
              <p className="text-sm text-destructive">{errors.depositAmount.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Additional Details</h3>

        <div className="space-y-2">
          <Label htmlFor="petPolicy">Pet Policy</Label>
          <Textarea
            id="petPolicy"
            placeholder="e.g., No pets allowed, Cats only, Dogs under 25lbs..."
            {...register('petPolicy')}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Unit' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
