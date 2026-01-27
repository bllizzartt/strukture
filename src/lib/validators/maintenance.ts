import { z } from 'zod';

// Maintenance enums
export const maintenanceStatuses = [
  'SUBMITTED',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
] as const;

export const maintenancePriorities = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as const;

export const maintenanceCategories = [
  'PLUMBING',
  'ELECTRICAL',
  'HVAC',
  'APPLIANCE',
  'STRUCTURAL',
  'PEST_CONTROL',
  'LANDSCAPING',
  'CLEANING',
  'SECURITY',
  'OTHER',
] as const;

// Create maintenance request schema
export const createMaintenanceRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(10, 'Please provide a detailed description').max(2000),
  category: z.enum(maintenanceCategories, {
    errorMap: () => ({ message: 'Please select a category' }),
  }),
  priority: z.enum(maintenancePriorities).optional().default('MEDIUM'),
  entryPermission: z.boolean().optional().default(false),
  preferredTimes: z.string().max(500).optional(),
  photoUrls: z.array(z.string().url()).optional().default([]),
});

// Update maintenance request schema (for landlord)
export const updateMaintenanceRequestSchema = z.object({
  status: z.enum(maintenanceStatuses).optional(),
  priority: z.enum(maintenancePriorities).optional(),
  assignedToId: z.string().optional(),
  scheduledDate: z.string().optional(),
  scheduledTimeSlot: z.string().max(100).optional(),
  estimatedCost: z.number().min(0).optional(),
  actualCost: z.number().min(0).optional(),
  vendorName: z.string().max(100).optional(),
  vendorPhone: z.string().max(20).optional(),
  resolutionNotes: z.string().max(2000).optional(),
});

// Add maintenance update (comment/note)
export const addMaintenanceUpdateSchema = z.object({
  message: z.string().min(1, 'Message is required').max(1000),
  newStatus: z.enum(maintenanceStatuses).optional(),
  isPublic: z.boolean().optional().default(true),
  photoUrls: z.array(z.string().url()).optional().default([]),
});

// Types
export type CreateMaintenanceRequestInput = z.infer<typeof createMaintenanceRequestSchema>;
export type UpdateMaintenanceRequestInput = z.infer<typeof updateMaintenanceRequestSchema>;
export type AddMaintenanceUpdateInput = z.infer<typeof addMaintenanceUpdateSchema>;

// Labels
export const maintenanceStatusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const maintenancePriorityLabels: Record<string, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  EMERGENCY: 'Emergency',
};

export const maintenanceCategoryLabels: Record<string, string> = {
  PLUMBING: 'Plumbing',
  ELECTRICAL: 'Electrical',
  HVAC: 'HVAC / Heating & Cooling',
  APPLIANCE: 'Appliance',
  STRUCTURAL: 'Structural',
  PEST_CONTROL: 'Pest Control',
  LANDSCAPING: 'Landscaping',
  CLEANING: 'Cleaning',
  SECURITY: 'Security',
  OTHER: 'Other',
};

// Status colors
export const maintenanceStatusColors: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  ACKNOWLEDGED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  ON_HOLD: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

// Priority colors
export const maintenancePriorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  EMERGENCY: 'bg-red-100 text-red-800',
};
