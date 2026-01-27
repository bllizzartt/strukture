import { prisma } from '@/lib/db';
import * as emailService from '@/lib/email';
import * as telegramService from '@/lib/telegram';

/**
 * Unified Notification Service
 *
 * This service handles sending notifications through multiple channels:
 * - Email (via Resend)
 * - Telegram
 * - In-app notifications (stored in database)
 *
 * Notifications are sent based on user preferences stored in the database.
 */

export type NotificationType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_DUE'
  | 'PAYMENT_LATE'
  | 'MAINTENANCE_SUBMITTED'
  | 'MAINTENANCE_UPDATE'
  | 'LEASE_EXPIRING'
  | 'LEASE_SIGNED'
  | 'WELCOME';

// ==================== Maintenance Notifications ====================

export interface MaintenanceNotificationData {
  requestId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  propertyId: string;
  propertyName: string;
  unitNumber: string;
  landlordId: string;
  landlordEmail: string;
  landlordName: string;
  landlordTelegramId?: string | null;
  entryPermission: boolean;
}

/**
 * Notify landlord when a new maintenance request is submitted
 */
export async function notifyMaintenanceSubmitted(
  data: MaintenanceNotificationData
): Promise<void> {
  // 1. Send email to landlord
  await emailService.sendMaintenanceSubmittedEmail(data.landlordEmail, {
    landlordName: data.landlordName,
    requestTitle: data.title,
    category: formatLabel(data.category),
    priority: formatLabel(data.priority),
    tenantName: data.tenantName,
    propertyName: data.propertyName,
    unitNumber: data.unitNumber,
    requestId: data.requestId,
  });

  // 2. Send Telegram notification if configured
  if (data.landlordTelegramId) {
    await telegramService.sendMaintenanceNotification(data.landlordTelegramId, {
      requestId: data.requestId,
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      tenantName: data.tenantName,
      propertyName: data.propertyName,
      unitNumber: data.unitNumber,
      entryPermission: data.entryPermission,
    });
  }

  // 3. Create in-app notification
  await createInAppNotification({
    userId: data.landlordId,
    type: 'MAINTENANCE_SUBMITTED',
    title: 'New Maintenance Request',
    message: `${data.tenantName} submitted a ${data.priority.toLowerCase()} priority maintenance request: ${data.title}`,
    link: `/landlord/maintenance/${data.requestId}`,
  });
}

export interface MaintenanceUpdateNotificationData {
  requestId: string;
  title: string;
  newStatus: string;
  message?: string;
  scheduledDate?: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  propertyName: string;
  unitNumber: string;
}

/**
 * Notify tenant when their maintenance request is updated
 */
export async function notifyMaintenanceUpdate(
  data: MaintenanceUpdateNotificationData
): Promise<void> {
  // 1. Send email to tenant
  await emailService.sendMaintenanceUpdateEmail(data.tenantEmail, {
    tenantName: data.tenantName,
    requestTitle: data.title,
    newStatus: formatLabel(data.newStatus),
    message: data.message,
    scheduledDate: data.scheduledDate,
    propertyName: data.propertyName,
    unitNumber: data.unitNumber,
    requestId: data.requestId,
  });

  // 2. Create in-app notification
  await createInAppNotification({
    userId: data.tenantId,
    type: 'MAINTENANCE_UPDATE',
    title: 'Maintenance Request Updated',
    message: `Your maintenance request "${data.title}" has been updated to: ${formatLabel(data.newStatus)}`,
    link: `/tenant/maintenance/${data.requestId}`,
  });
}

// ==================== Payment Notifications ====================

export interface PaymentReceivedNotificationData {
  paymentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId?: string;
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  propertyName: string;
  unitNumber: string;
  landlordId: string;
  landlordEmail: string;
  landlordName: string;
  landlordTelegramId?: string | null;
}

/**
 * Notify about successful payment
 */
export async function notifyPaymentReceived(
  data: PaymentReceivedNotificationData
): Promise<void> {
  // 1. Send confirmation email to tenant
  await emailService.sendPaymentConfirmation(data.tenantEmail, {
    tenantName: data.tenantName,
    amount: data.amount,
    paymentDate: data.paymentDate,
    propertyName: data.propertyName,
    unitNumber: data.unitNumber,
    paymentMethod: formatLabel(data.paymentMethod),
    transactionId: data.transactionId,
  });

  // 2. Send Telegram notification to landlord if configured
  if (data.landlordTelegramId) {
    await telegramService.sendPaymentNotification(data.landlordTelegramId, {
      paymentId: data.paymentId,
      amount: data.amount,
      tenantName: data.tenantName,
      propertyName: data.propertyName,
      unitNumber: data.unitNumber,
      paymentMethod: data.paymentMethod,
    });
  }

  // 3. Create in-app notifications
  await createInAppNotification({
    userId: data.tenantId,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Confirmed',
    message: `Your payment of ${formatCurrency(data.amount)} has been processed successfully.`,
    link: '/tenant/payments',
  });

  await createInAppNotification({
    userId: data.landlordId,
    type: 'PAYMENT_RECEIVED',
    title: 'Payment Received',
    message: `${data.tenantName} paid ${formatCurrency(data.amount)} for ${data.propertyName} - Unit ${data.unitNumber}`,
    link: '/landlord/payments',
  });
}

export interface RentDueNotificationData {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  amount: number;
  dueDate: string;
  propertyName: string;
  unitNumber: string;
}

/**
 * Send rent due reminder
 */
export async function notifyRentDue(data: RentDueNotificationData): Promise<void> {
  // 1. Send email reminder
  await emailService.sendRentDueReminder(data.tenantEmail, {
    tenantName: data.tenantName,
    amount: data.amount,
    dueDate: data.dueDate,
    propertyName: data.propertyName,
    unitNumber: data.unitNumber,
  });

  // 2. Create in-app notification
  await createInAppNotification({
    userId: data.tenantId,
    type: 'PAYMENT_DUE',
    title: 'Rent Due Reminder',
    message: `Your rent payment of ${formatCurrency(data.amount)} is due on ${formatDate(data.dueDate)}.`,
    link: '/tenant/payments/new',
  });
}

export interface LatePaymentNotificationData {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  amount: number;
  dueDate: string;
  daysLate: number;
  lateFee?: number;
  propertyName: string;
  unitNumber: string;
}

/**
 * Send late payment notice
 */
export async function notifyLatePayment(data: LatePaymentNotificationData): Promise<void> {
  // 1. Send email notice
  await emailService.sendLatePaymentNotice(data.tenantEmail, {
    tenantName: data.tenantName,
    amount: data.amount,
    dueDate: data.dueDate,
    daysLate: data.daysLate,
    propertyName: data.propertyName,
    unitNumber: data.unitNumber,
    lateFee: data.lateFee,
  });

  // 2. Create in-app notification
  await createInAppNotification({
    userId: data.tenantId,
    type: 'PAYMENT_LATE',
    title: 'Late Payment Notice',
    message: `Your rent payment is ${data.daysLate} days overdue. Please pay immediately to avoid additional fees.`,
    link: '/tenant/payments/new',
  });
}

// ==================== Lease Notifications ====================

export interface LeaseExpirationNotificationData {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  propertyName: string;
  unitNumber: string;
  expirationDate: string;
  daysRemaining: number;
  landlordId: string;
}

/**
 * Send lease expiration reminder
 */
export async function notifyLeaseExpiring(data: LeaseExpirationNotificationData): Promise<void> {
  // 1. Send email to tenant
  await emailService.sendLeaseExpirationReminder(data.tenantEmail, {
    tenantName: data.tenantName,
    propertyName: data.propertyName,
    unitNumber: data.unitNumber,
    expirationDate: data.expirationDate,
    daysRemaining: data.daysRemaining,
  });

  // 2. Create in-app notifications for tenant and landlord
  await createInAppNotification({
    userId: data.tenantId,
    type: 'LEASE_EXPIRING',
    title: 'Lease Expiring Soon',
    message: `Your lease expires in ${data.daysRemaining} days. Please contact your property manager about renewal.`,
    link: '/tenant/dashboard',
  });

  await createInAppNotification({
    userId: data.landlordId,
    type: 'LEASE_EXPIRING',
    title: 'Lease Expiring Soon',
    message: `Lease for ${data.tenantName} at ${data.propertyName} - Unit ${data.unitNumber} expires in ${data.daysRemaining} days.`,
    link: '/landlord/tenants',
  });
}

export interface WelcomeNotificationData {
  tenantId: string;
  tenantName: string;
  tenantEmail: string;
  propertyName: string;
  unitNumber: string;
  moveInDate: string;
  monthlyRent: number;
}

/**
 * Send welcome email to new tenant
 */
export async function notifyWelcome(data: WelcomeNotificationData): Promise<void> {
  // Send welcome email
  await emailService.sendWelcomeEmail(data.tenantEmail, {
    tenantName: data.tenantName,
    propertyName: data.propertyName,
    unitNumber: data.unitNumber,
    moveInDate: data.moveInDate,
    monthlyRent: data.monthlyRent,
  });

  // Create in-app welcome notification
  await createInAppNotification({
    userId: data.tenantId,
    type: 'WELCOME',
    title: 'Welcome to Strukture!',
    message: `Welcome to ${data.propertyName}! Your tenant portal is ready to use.`,
    link: '/tenant/dashboard',
  });
}

// ==================== In-App Notifications ====================

type NotificationCategory =
  | 'PAYMENT_REMINDER'
  | 'PAYMENT_RECEIVED'
  | 'LEASE_EXPIRING'
  | 'MAINTENANCE_UPDATE'
  | 'GENERAL'
  | 'SYSTEM';

interface InAppNotificationData {
  userId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  link?: string;
}

// Map our internal types to database categories
function mapToCategory(type: NotificationType): NotificationCategory {
  switch (type) {
    case 'PAYMENT_RECEIVED':
      return 'PAYMENT_RECEIVED';
    case 'PAYMENT_DUE':
    case 'PAYMENT_LATE':
      return 'PAYMENT_REMINDER';
    case 'MAINTENANCE_SUBMITTED':
    case 'MAINTENANCE_UPDATE':
      return 'MAINTENANCE_UPDATE';
    case 'LEASE_EXPIRING':
    case 'LEASE_SIGNED':
      return 'LEASE_EXPIRING';
    case 'WELCOME':
    default:
      return 'GENERAL';
  }
}

/**
 * Create an in-app notification stored in the database
 */
async function createInAppNotification(
  data: Omit<InAppNotificationData, 'category'> & { type: NotificationType }
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: data.userId,
        type: 'IN_APP',
        category: mapToCategory(data.type),
        title: data.title,
        message: data.message,
        actionUrl: data.link,
        sentAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to create in-app notification:', error);
  }
}

// ==================== Helpers ====================

function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
