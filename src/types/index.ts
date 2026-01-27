export type UserRole = 'TENANT' | 'LANDLORD' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';

export type PropertyType =
  | 'SINGLE_FAMILY'
  | 'MULTI_FAMILY'
  | 'APARTMENT'
  | 'CONDO'
  | 'TOWNHOUSE'
  | 'COMMERCIAL';

export type PropertyStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_RENOVATION';

export type UnitStatus = 'VACANT' | 'OCCUPIED' | 'UNDER_MAINTENANCE' | 'RESERVED';

export type LeaseStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'RENEWED';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'ACH'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'CASHIER_CHECK'
  | 'CASH'
  | 'OTHER';

export type PaymentType =
  | 'RENT'
  | 'DEPOSIT'
  | 'LATE_FEE'
  | 'UTILITY'
  | 'MAINTENANCE'
  | 'OTHER';

export type MaintenanceStatus =
  | 'SUBMITTED'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type MaintenanceCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'HVAC'
  | 'APPLIANCE'
  | 'STRUCTURAL'
  | 'PEST_CONTROL'
  | 'LANDSCAPING'
  | 'CLEANING'
  | 'SECURITY'
  | 'OTHER';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
