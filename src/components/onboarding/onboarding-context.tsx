'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type {
  PersonalInfoInput,
  EmergencyContactInput,
  EmploymentInfoInput,
  LeaseSelectionInput,
} from '@/lib/validators/onboarding';

export type OnboardingData = Partial<
  PersonalInfoInput &
    EmergencyContactInput &
    EmploymentInfoInput &
    LeaseSelectionInput & {
      agreedToTerms: boolean;
      signature: string;
    }
>;

interface OnboardingContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  data: OnboardingData;
  updateData: (newData: Partial<OnboardingData>) => void;
  resetData: () => void;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STEPS = [
  'Personal Information',
  'Emergency Contact',
  'Employment & Income',
  'Select Unit',
  'Review & Sign',
];

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateData = (newData: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...newData }));
  };

  const resetData = () => {
    setData({});
    setCurrentStep(0);
  };

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        data,
        updateData,
        resetData,
        isSubmitting,
        setIsSubmitting,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}

export { STEPS };
