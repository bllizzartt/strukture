import { z } from 'zod';

// Property Type enum values
export const propertyTypes = [
  'SINGLE_FAMILY',
  'MULTI_FAMILY',
  'APARTMENT',
  'CONDO',
  'TOWNHOUSE',
  'COMMERCIAL',
] as const;

export const propertyStatuses = ['ACTIVE', 'INACTIVE', 'UNDER_RENOVATION'] as const;

export const unitStatuses = ['VACANT', 'OCCUPIED', 'UNDER_MAINTENANCE', 'RESERVED'] as const;

// Property schemas
export const createPropertySchema = z.object({
  name: z.string().min(1, 'Property name is required').max(100),
  type: z.enum(propertyTypes, {
    errorMap: () => ({ message: 'Please select a property type' }),
  }),
  status: z.enum(propertyStatuses).optional().default('ACTIVE'),
  addressLine1: z.string().min(1, 'Address is required').max(200),
  addressLine2: z.string().max(200).optional(),
  city: z.string().min(1, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(50),
  zipCode: z.string().min(5, 'Valid ZIP code is required').max(10),
  country: z.string().default('US'),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  totalUnits: z.number().int().min(1).default(1),
  parkingSpaces: z.number().int().min(0).optional(),
  amenities: z.array(z.string()).default([]),
  licenseNumber: z.string().max(50).optional(),
  licenseExpiry: z.string().datetime().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

// Unit schemas
export const createUnitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit number is required').max(20),
  status: z.enum(unitStatuses).optional().default('VACANT'),
  bedrooms: z.number().int().min(0, 'Bedrooms must be 0 or more'),
  bathrooms: z.number().min(0, 'Bathrooms must be 0 or more').multipleOf(0.5),
  squareFeet: z.number().int().min(1).optional(),
  floor: z.number().int().optional(),
  monthlyRent: z.number().min(0, 'Rent must be a positive number'),
  depositAmount: z.number().min(0, 'Deposit must be a positive number'),
  features: z.array(z.string()).default([]),
  petPolicy: z.string().max(500).optional(),
});

export const updateUnitSchema = createUnitSchema.partial();

// Types
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;

// Property type labels for UI
export const propertyTypeLabels: Record<(typeof propertyTypes)[number], string> = {
  SINGLE_FAMILY: 'Single Family',
  MULTI_FAMILY: 'Multi-Family',
  APARTMENT: 'Apartment',
  CONDO: 'Condo',
  TOWNHOUSE: 'Townhouse',
  COMMERCIAL: 'Commercial',
};

export const propertyStatusLabels: Record<(typeof propertyStatuses)[number], string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  UNDER_RENOVATION: 'Under Renovation',
};

export const unitStatusLabels: Record<(typeof unitStatuses)[number], string> = {
  VACANT: 'Vacant',
  OCCUPIED: 'Occupied',
  UNDER_MAINTENANCE: 'Under Maintenance',
  RESERVED: 'Reserved',
};
