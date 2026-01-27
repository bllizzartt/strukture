'use client';

import { Card, CardContent } from '@/components/ui/card';
import { OnboardingProvider, useOnboarding, STEPS } from '@/components/onboarding/onboarding-context';
import { PersonalInfoStep } from '@/components/onboarding/steps/personal-info-step';
import { EmergencyContactStep } from '@/components/onboarding/steps/emergency-contact-step';
import { EmploymentStep } from '@/components/onboarding/steps/employment-step';
import { UnitSelectionStep } from '@/components/onboarding/steps/unit-selection-step';
import { ReviewSignStep } from '@/components/onboarding/steps/review-sign-step';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

function OnboardingSteps() {
  const { currentStep } = useOnboarding();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors',
                    index < currentStep
                      ? 'bg-primary border-primary text-primary-foreground'
                      : index === currentStep
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-muted text-muted-foreground'
                  )}
                >
                  {index < currentStep ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-2 text-center hidden md:block',
                    index <= currentStep ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}
                >
                  {step}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 w-12 md:w-20 lg:w-28 mx-2',
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardContent className="pt-6">
          {currentStep === 0 && <PersonalInfoStep />}
          {currentStep === 1 && <EmergencyContactStep />}
          {currentStep === 2 && <EmploymentStep />}
          {currentStep === 3 && <UnitSelectionStep />}
          {currentStep === 4 && <ReviewSignStep />}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Tenant Application</h1>
          <p className="text-muted-foreground mt-2">
            Complete the form below to apply for your new home
          </p>
        </div>
        <OnboardingSteps />
      </div>
    </OnboardingProvider>
  );
}
