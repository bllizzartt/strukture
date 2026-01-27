import { z } from 'zod';

// Step 1: Personal Information
export const personalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(10, 'Valid phone number is required').max(20),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  ssnLast4: z.string().length(4, 'Last 4 digits of SSN required').regex(/^\d{4}$/, 'Must be 4 digits'),
});

// Step 2: Emergency Contact
export const emergencyContactSchema = z.object({
  emergencyContactName: z.string().min(1, 'Emergency contact name is required').max(100),
  emergencyContactPhone: z.string().min(10, 'Valid phone number is required').max(20),
  emergencyContactRelation: z.string().min(1, 'Relationship is required').max(50),
});

// Step 3: Employment Information
export const employmentInfoSchema = z.object({
  employmentStatus: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED', 'STUDENT', 'RETIRED'], {
    errorMap: () => ({ message: 'Please select employment status' }),
  }),
  employerName: z.string().max(100).optional(),
  employerPhone: z.string().max(20).optional(),
  jobTitle: z.string().max(100).optional(),
  monthlyIncome: z.number().min(0, 'Income must be a positive number'),
  additionalIncome: z.number().min(0).optional(),
  incomeSource: z.string().max(200).optional(),
});

// Step 4: Lease Selection (unit/property info)
export const leaseSelectionSchema = z.object({
  unitId: z.string().min(1, 'Please select a unit'),
  moveInDate: z.string().min(1, 'Move-in date is required'),
  leaseTerm: z.enum(['6', '12', '18', '24'], {
    errorMap: () => ({ message: 'Please select a lease term' }),
  }),
});

// Step 5: Review & Signature
export const signatureSchema = z.object({
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms and conditions',
  }),
  signature: z.string().min(1, 'Signature is required'),
});

// Complete onboarding data
export const completeOnboardingSchema = z.object({
  // Personal info
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  dateOfBirth: z.string(),
  ssnLast4: z.string().length(4),

  // Emergency contact
  emergencyContactName: z.string().min(1).max(100),
  emergencyContactPhone: z.string().min(10).max(20),
  emergencyContactRelation: z.string().min(1).max(50),

  // Employment
  employmentStatus: z.enum(['EMPLOYED', 'SELF_EMPLOYED', 'UNEMPLOYED', 'STUDENT', 'RETIRED']),
  employerName: z.string().optional(),
  employerPhone: z.string().optional(),
  jobTitle: z.string().optional(),
  monthlyIncome: z.number().min(0),
  additionalIncome: z.number().optional(),
  incomeSource: z.string().optional(),

  // Lease
  unitId: z.string().min(1),
  moveInDate: z.string(),
  leaseTerm: z.enum(['6', '12', '18', '24']),

  // Signature
  agreedToTerms: z.boolean(),
  signature: z.string().min(1),
});

// Types
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
export type EmploymentInfoInput = z.infer<typeof employmentInfoSchema>;
export type LeaseSelectionInput = z.infer<typeof leaseSelectionSchema>;
export type SignatureInput = z.infer<typeof signatureSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

// Employment status labels
export const employmentStatusLabels: Record<string, string> = {
  EMPLOYED: 'Employed',
  SELF_EMPLOYED: 'Self-Employed',
  UNEMPLOYED: 'Unemployed',
  STUDENT: 'Student',
  RETIRED: 'Retired',
};

// Lease term labels
export const leaseTermLabels: Record<string, string> = {
  '6': '6 Months',
  '12': '12 Months (1 Year)',
  '18': '18 Months',
  '24': '24 Months (2 Years)',
};
