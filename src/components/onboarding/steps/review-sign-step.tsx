'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { Loader2, Check, AlertCircle, Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useOnboarding } from '../onboarding-context';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { employmentStatusLabels, leaseTermLabels } from '@/lib/validators/onboarding';
import { addMonths, format } from 'date-fns';

interface AvailableUnit {
  id: string;
  unitNumber: string;
  monthlyRent: string | number;
  depositAmount: string | number;
  property: {
    name: string;
    addressLine1: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export function ReviewSignStep() {
  const router = useRouter();
  const { toast } = useToast();
  const { data, updateData, setCurrentStep, isSubmitting, setIsSubmitting } = useOnboarding();
  const signatureRef = useRef<SignatureCanvas>(null);
  const [agreed, setAgreed] = useState(data.agreedToTerms || false);
  const [hasSignature, setHasSignature] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<AvailableUnit | null>(null);

  useEffect(() => {
    if (data.unitId) {
      fetchUnit();
    }
  }, [data.unitId]);

  const fetchUnit = async () => {
    try {
      const response = await fetch('/api/onboarding/available-units');
      const result = await response.json();
      if (result.success) {
        const unit = result.data.find((u: AvailableUnit) => u.id === data.unitId);
        setSelectedUnit(unit || null);
      }
    } catch (error) {
      console.error('Error fetching unit:', error);
    }
  };

  const handleClearSignature = () => {
    signatureRef.current?.clear();
    setHasSignature(false);
  };

  const handleSignatureEnd = () => {
    setHasSignature(!signatureRef.current?.isEmpty());
  };

  const handleBack = () => {
    setCurrentStep(3);
  };

  const handleSubmit = async () => {
    if (!agreed) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please agree to the terms and conditions',
      });
      return;
    }

    if (!hasSignature || signatureRef.current?.isEmpty()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please provide your signature',
      });
      return;
    }

    const signature = signatureRef.current?.toDataURL('image/png') || '';
    updateData({ agreedToTerms: agreed, signature });

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          agreedToTerms: agreed,
          signature,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to submit application',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Your application has been submitted successfully!',
      });

      router.push('/onboarding/success');
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

  const rent = selectedUnit
    ? typeof selectedUnit.monthlyRent === 'string'
      ? parseFloat(selectedUnit.monthlyRent)
      : selectedUnit.monthlyRent
    : 0;

  const deposit = selectedUnit
    ? typeof selectedUnit.depositAmount === 'string'
      ? parseFloat(selectedUnit.depositAmount)
      : selectedUnit.depositAmount
    : 0;

  const leaseEndDate = data.moveInDate && data.leaseTerm
    ? format(addMonths(new Date(data.moveInDate), parseInt(data.leaseTerm)), 'MMMM d, yyyy')
    : '';

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Review & Sign</h2>
        <p className="text-muted-foreground">
          Please review your information and sign to complete your application.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Name:</strong> {data.firstName} {data.lastName}</p>
            <p><strong>Email:</strong> {data.email}</p>
            <p><strong>Phone:</strong> {data.phone}</p>
            <p><strong>DOB:</strong> {data.dateOfBirth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Name:</strong> {data.emergencyContactName}</p>
            <p><strong>Phone:</strong> {data.emergencyContactPhone}</p>
            <p><strong>Relation:</strong> {data.emergencyContactRelation}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Employment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p><strong>Status:</strong> {employmentStatusLabels[data.employmentStatus || ''] || '-'}</p>
            {data.employerName && <p><strong>Employer:</strong> {data.employerName}</p>}
            <p><strong>Monthly Income:</strong> {formatCurrency(data.monthlyIncome || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lease Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {selectedUnit && (
              <>
                <p><strong>Property:</strong> {selectedUnit.property.name}</p>
                <p><strong>Unit:</strong> {selectedUnit.unitNumber}</p>
                <p><strong>Address:</strong> {selectedUnit.property.addressLine1}, {selectedUnit.property.city}, {selectedUnit.property.state}</p>
              </>
            )}
            <p><strong>Move-in:</strong> {data.moveInDate ? format(new Date(data.moveInDate), 'MMMM d, yyyy') : '-'}</p>
            <p><strong>Lease Term:</strong> {leaseTermLabels[data.leaseTerm || ''] || '-'}</p>
            <p><strong>Lease Ends:</strong> {leaseEndDate}</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card className="bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Monthly Rent</p>
              <p className="text-lg font-semibold">{formatCurrency(rent)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Security Deposit</p>
              <p className="text-lg font-semibold">{formatCurrency(deposit)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <p className="font-medium">Due at Signing</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(rent + deposit)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              First month's rent + security deposit
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Terms Agreement */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked as boolean)}
            />
            <div className="space-y-1">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                I agree to the terms and conditions
              </label>
              <p className="text-xs text-muted-foreground">
                By checking this box, I acknowledge that I have read and agree to the lease terms,
                community rules, and understand my obligations as a tenant. I certify that all
                information provided is accurate and complete.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Your Signature *</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearSignature}
            >
              <Eraser className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg bg-white">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: 'w-full h-40 cursor-crosshair',
                style: { width: '100%', height: '160px' },
              }}
              onEnd={handleSignatureEnd}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Sign above using your mouse or touch screen. Your signature will be legally binding.
          </p>
        </CardContent>
      </Card>

      {/* Notice */}
      <div className="flex items-start gap-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-yellow-800">
          <p className="font-medium">Important Notice</p>
          <p>
            By submitting this application, you authorize us to verify your identity, employment,
            and rental history. A non-refundable application fee may apply.
          </p>
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || !agreed || !hasSignature}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Submit Application
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
