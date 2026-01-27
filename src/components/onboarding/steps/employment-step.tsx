'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
  employmentInfoSchema,
  employmentStatusLabels,
  type EmploymentInfoInput,
} from '@/lib/validators/onboarding';
import { useOnboarding } from '../onboarding-context';

const employmentStatuses = ['EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED', 'STUDENT', 'RETIRED'] as const;

export function EmploymentStep() {
  const { data, updateData, setCurrentStep } = useOnboarding();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmploymentInfoInput>({
    resolver: zodResolver(employmentInfoSchema),
    defaultValues: {
      employmentStatus: data.employmentStatus || undefined,
      employerName: data.employerName || '',
      employerPhone: data.employerPhone || '',
      jobTitle: data.jobTitle || '',
      monthlyIncome: data.monthlyIncome || 0,
      additionalIncome: data.additionalIncome || 0,
      incomeSource: data.incomeSource || '',
    },
  });

  const selectedStatus = watch('employmentStatus');
  const showEmployerFields = selectedStatus === 'EMPLOYED' || selectedStatus === 'SELF_EMPLOYED';

  const onSubmit = (formData: EmploymentInfoInput) => {
    updateData(formData);
    setCurrentStep(3);
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Employment & Income</h2>
        <p className="text-muted-foreground">
          Please provide your employment and income information.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employmentStatus">Employment Status *</Label>
        <Select
          value={selectedStatus}
          onValueChange={(value) =>
            setValue('employmentStatus', value as (typeof employmentStatuses)[number])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select employment status" />
          </SelectTrigger>
          <SelectContent>
            {employmentStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {employmentStatusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.employmentStatus && (
          <p className="text-sm text-destructive">{errors.employmentStatus.message}</p>
        )}
      </div>

      {showEmployerFields && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employerName">Employer Name</Label>
              <Input
                id="employerName"
                placeholder="Company name"
                {...register('employerName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employerPhone">Employer Phone</Label>
              <Input
                id="employerPhone"
                type="tel"
                placeholder="(555) 123-4567"
                {...register('employerPhone')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              placeholder="Your position"
              {...register('jobTitle')}
            />
          </div>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="monthlyIncome">Monthly Income *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="monthlyIncome"
              type="number"
              min="0"
              step="0.01"
              className="pl-7"
              {...register('monthlyIncome', { valueAsNumber: true })}
            />
          </div>
          {errors.monthlyIncome && (
            <p className="text-sm text-destructive">{errors.monthlyIncome.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="additionalIncome">Additional Income</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="additionalIncome"
              type="number"
              min="0"
              step="0.01"
              className="pl-7"
              {...register('additionalIncome', { valueAsNumber: true })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="incomeSource">Additional Income Source</Label>
        <Input
          id="incomeSource"
          placeholder="e.g., Side business, investments, etc."
          {...register('incomeSource')}
        />
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
