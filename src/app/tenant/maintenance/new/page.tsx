'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  createMaintenanceRequestSchema,
  maintenanceCategories,
  maintenanceCategoryLabels,
  maintenancePriorities,
  maintenancePriorityLabels,
  type CreateMaintenanceRequestInput,
} from '@/lib/validators/maintenance';

export default function NewMaintenanceRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateMaintenanceRequestInput>({
    resolver: zodResolver(createMaintenanceRequestSchema),
    defaultValues: {
      title: '',
      description: '',
      category: undefined,
      priority: 'MEDIUM',
      entryPermission: false,
      preferredTimes: '',
      photoUrls: [],
    },
  });

  const selectedCategory = watch('category');
  const selectedPriority = watch('priority');
  const entryPermission = watch('entryPermission');

  const onSubmit = async (data: CreateMaintenanceRequestInput) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/tenant/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to submit request',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Your maintenance request has been submitted',
      });

      router.push('/tenant/maintenance');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/tenant/maintenance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Maintenance Request</h1>
          <p className="text-muted-foreground">Report an issue that needs attention</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            Please provide as much detail as possible to help us address your issue quickly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Brief description of the issue"
                {...register('title')}
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={(value) =>
                    setValue('category', value as (typeof maintenanceCategories)[number])
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {maintenanceCategoryLabels[category]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={selectedPriority}
                  onValueChange={(value) =>
                    setValue('priority', value as (typeof maintenancePriorities)[number])
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenancePriorities.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {maintenancePriorityLabels[priority]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select Emergency only for urgent issues like water leaks or no heat
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Please describe the issue in detail. Include what's wrong, when it started, and any other relevant information."
                rows={5}
                {...register('description')}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="entryPermission"
                  checked={entryPermission}
                  onCheckedChange={(checked) =>
                    setValue('entryPermission', checked as boolean)
                  }
                  disabled={isSubmitting}
                />
                <div className="space-y-1">
                  <label
                    htmlFor="entryPermission"
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Permission to enter
                  </label>
                  <p className="text-xs text-muted-foreground">
                    I give permission for maintenance personnel to enter my unit if I am not home
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferredTimes">Preferred Times (Optional)</Label>
              <Textarea
                id="preferredTimes"
                placeholder="e.g., Weekdays after 5pm, Saturday mornings"
                rows={2}
                {...register('preferredTimes')}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Let us know when is the best time for maintenance to visit
              </p>
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
