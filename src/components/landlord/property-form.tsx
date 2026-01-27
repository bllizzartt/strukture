'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
import {
  createPropertySchema,
  propertyTypes,
  propertyStatuses,
  propertyTypeLabels,
  propertyStatusLabels,
  type CreatePropertyInput,
} from '@/lib/validators/property';
import { useToast } from '@/hooks/use-toast';

interface PropertyFormProps {
  initialData?: Partial<CreatePropertyInput> & { id?: string };
  mode: 'create' | 'edit';
}

export function PropertyForm({ initialData, mode }: PropertyFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'SINGLE_FAMILY',
      status: initialData?.status || 'ACTIVE',
      addressLine1: initialData?.addressLine1 || '',
      addressLine2: initialData?.addressLine2 || '',
      city: initialData?.city || '',
      state: initialData?.state || '',
      zipCode: initialData?.zipCode || '',
      country: initialData?.country || 'US',
      yearBuilt: initialData?.yearBuilt,
      totalUnits: initialData?.totalUnits || 1,
      parkingSpaces: initialData?.parkingSpaces,
      amenities: initialData?.amenities || [],
      licenseNumber: initialData?.licenseNumber || '',
    },
  });

  const selectedType = watch('type');
  const selectedStatus = watch('status');

  const onSubmit = async (data: CreatePropertyInput) => {
    setIsLoading(true);

    try {
      const url =
        mode === 'create'
          ? '/api/landlord/properties'
          : `/api/landlord/properties/${initialData?.id}`;

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
          description: result.error || 'Failed to save property',
        });
        return;
      }

      toast({
        title: 'Success',
        description:
          mode === 'create'
            ? 'Property created successfully'
            : 'Property updated successfully',
      });

      router.push(`/landlord/properties/${result.data.id}`);
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
        <h3 className="text-lg font-medium">Basic Information</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Sunset Apartments"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Property Type *</Label>
            <Select
              value={selectedType}
              onValueChange={(value) =>
                setValue('type', value as (typeof propertyTypes)[number])
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {propertyTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-destructive">{errors.type.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) =>
                setValue('status', value as (typeof propertyStatuses)[number])
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {propertyStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {propertyStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearBuilt">Year Built</Label>
            <Input
              id="yearBuilt"
              type="number"
              placeholder="e.g., 2010"
              {...register('yearBuilt', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.yearBuilt && (
              <p className="text-sm text-destructive">{errors.yearBuilt.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Address</h3>

        <div className="space-y-2">
          <Label htmlFor="addressLine1">Street Address *</Label>
          <Input
            id="addressLine1"
            placeholder="123 Main Street"
            {...register('addressLine1')}
            disabled={isLoading}
          />
          {errors.addressLine1 && (
            <p className="text-sm text-destructive">{errors.addressLine1.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="addressLine2">Address Line 2</Label>
          <Input
            id="addressLine2"
            placeholder="Suite, Floor, Building (optional)"
            {...register('addressLine2')}
            disabled={isLoading}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              placeholder="Los Angeles"
              {...register('city')}
              disabled={isLoading}
            />
            {errors.city && (
              <p className="text-sm text-destructive">{errors.city.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              placeholder="CA"
              {...register('state')}
              disabled={isLoading}
            />
            {errors.state && (
              <p className="text-sm text-destructive">{errors.state.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP Code *</Label>
            <Input
              id="zipCode"
              placeholder="90001"
              {...register('zipCode')}
              disabled={isLoading}
            />
            {errors.zipCode && (
              <p className="text-sm text-destructive">{errors.zipCode.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Additional Details</h3>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="totalUnits">Total Units</Label>
            <Input
              id="totalUnits"
              type="number"
              min="1"
              {...register('totalUnits', { valueAsNumber: true })}
              disabled={isLoading}
            />
            {errors.totalUnits && (
              <p className="text-sm text-destructive">{errors.totalUnits.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parkingSpaces">Parking Spaces</Label>
            <Input
              id="parkingSpaces"
              type="number"
              min="0"
              {...register('parkingSpaces', { valueAsNumber: true })}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="licenseNumber">License Number</Label>
            <Input
              id="licenseNumber"
              placeholder="Optional"
              {...register('licenseNumber')}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Property' : 'Save Changes'}
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
