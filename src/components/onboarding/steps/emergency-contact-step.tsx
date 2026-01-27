'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { emergencyContactSchema, type EmergencyContactInput } from '@/lib/validators/onboarding';
import { useOnboarding } from '../onboarding-context';

export function EmergencyContactStep() {
  const { data, updateData, setCurrentStep } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmergencyContactInput>({
    resolver: zodResolver(emergencyContactSchema),
    defaultValues: {
      emergencyContactName: data.emergencyContactName || '',
      emergencyContactPhone: data.emergencyContactPhone || '',
      emergencyContactRelation: data.emergencyContactRelation || '',
    },
  });

  const onSubmit = (formData: EmergencyContactInput) => {
    updateData(formData);
    setCurrentStep(2);
  };

  const handleBack = () => {
    setCurrentStep(0);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Emergency Contact</h2>
        <p className="text-muted-foreground">
          Please provide someone we can contact in case of emergency.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergencyContactName">Contact Name *</Label>
        <Input
          id="emergencyContactName"
          placeholder="Jane Doe"
          {...register('emergencyContactName')}
        />
        {errors.emergencyContactName && (
          <p className="text-sm text-destructive">{errors.emergencyContactName.message}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="emergencyContactPhone">Phone Number *</Label>
          <Input
            id="emergencyContactPhone"
            type="tel"
            placeholder="(555) 123-4567"
            {...register('emergencyContactPhone')}
          />
          {errors.emergencyContactPhone && (
            <p className="text-sm text-destructive">{errors.emergencyContactPhone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergencyContactRelation">Relationship *</Label>
          <Input
            id="emergencyContactRelation"
            placeholder="e.g., Parent, Spouse, Sibling"
            {...register('emergencyContactRelation')}
          />
          {errors.emergencyContactRelation && (
            <p className="text-sm text-destructive">{errors.emergencyContactRelation.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button type="submit">
          Continue
        </Button>
      </div>
    </form>
  );
}
