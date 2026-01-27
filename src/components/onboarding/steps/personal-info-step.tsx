'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { personalInfoSchema, type PersonalInfoInput } from '@/lib/validators/onboarding';
import { useOnboarding } from '../onboarding-context';

export function PersonalInfoStep() {
  const { data, updateData, setCurrentStep } = useOnboarding();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PersonalInfoInput>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      dateOfBirth: data.dateOfBirth || '',
      ssnLast4: data.ssnLast4 || '',
    },
  });

  const onSubmit = (formData: PersonalInfoInput) => {
    updateData(formData);
    setCurrentStep(1);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Personal Information</h2>
        <p className="text-muted-foreground">Please provide your personal details.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            placeholder="John"
            {...register('firstName')}
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            placeholder="Doe"
            {...register('lastName')}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            {...register('dateOfBirth')}
          />
          {errors.dateOfBirth && (
            <p className="text-sm text-destructive">{errors.dateOfBirth.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ssnLast4">Last 4 Digits of SSN *</Label>
          <Input
            id="ssnLast4"
            type="password"
            maxLength={4}
            placeholder="****"
            {...register('ssnLast4')}
          />
          {errors.ssnLast4 && (
            <p className="text-sm text-destructive">{errors.ssnLast4.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Your SSN is encrypted and used only for verification purposes.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">
          Continue
        </Button>
      </div>
    </form>
  );
}
