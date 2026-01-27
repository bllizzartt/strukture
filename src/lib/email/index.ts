import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY is not set - Email notifications disabled');
    return null;
  }

  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }

  return resendInstance;
}

// Email sender config
const FROM_EMAIL = process.env.EMAIL_FROM || 'Strukture <noreply@strukture.com>';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Base email template
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Strukture</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #1a1a1a;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background-color: #ffffff;
      padding: 30px;
      border: 1px solid #e5e5e5;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background-color: #1a1a1a;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
    .button:hover {
      background-color: #333;
    }
    .footer {
      text-align: center;
      color: #666;
      font-size: 12px;
      margin-top: 20px;
    }
    .info-box {
      background-color: #f5f5f5;
      padding: 15px;
      border-radius: 6px;
      margin: 15px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
    }
    .label {
      color: #666;
    }
    .value {
      font-weight: 600;
    }
    .highlight {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 12px;
      margin: 15px 0;
    }
    .success {
      background-color: #d1fae5;
      border-left: 4px solid #10b981;
    }
    .urgent {
      background-color: #fee2e2;
      border-left: 4px solid #ef4444;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Strukture</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>This email was sent by Strukture Property Management</p>
    <p>If you have questions, please contact your property manager.</p>
  </div>
</body>
</html>
`;
}

// ==================== Email Types ====================

export interface WelcomeEmailData {
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  moveInDate: string;
  monthlyRent: number;
}

export interface PaymentConfirmationData {
  tenantName: string;
  amount: number;
  paymentDate: string;
  propertyName: string;
  unitNumber: string;
  paymentMethod: string;
  transactionId?: string;
}

export interface RentDueReminderData {
  tenantName: string;
  amount: number;
  dueDate: string;
  propertyName: string;
  unitNumber: string;
}

export interface LatePaymentNoticeData {
  tenantName: string;
  amount: number;
  dueDate: string;
  daysLate: number;
  propertyName: string;
  unitNumber: string;
  lateFee?: number;
}

export interface MaintenanceSubmittedData {
  landlordName: string;
  requestTitle: string;
  category: string;
  priority: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  requestId: string;
}

export interface MaintenanceUpdateData {
  tenantName: string;
  requestTitle: string;
  newStatus: string;
  message?: string;
  scheduledDate?: string;
  propertyName: string;
  unitNumber: string;
  requestId: string;
}

export interface LeaseExpirationData {
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  expirationDate: string;
  daysRemaining: number;
}

// ==================== Email Sending Functions ====================

/**
 * Send welcome email to new tenant
 */
export async function sendWelcomeEmail(to: string, data: WelcomeEmailData): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const content = `
    <h2>Welcome to ${data.propertyName}!</h2>
    <p>Dear ${data.tenantName},</p>
    <p>Welcome to your new home! We're excited to have you as a resident.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName}</span>
      </div>
      <div class="info-row">
        <span class="label">Unit:</span>
        <span class="value">${data.unitNumber}</span>
      </div>
      <div class="info-row">
        <span class="label">Move-in Date:</span>
        <span class="value">${formatDate(data.moveInDate)}</span>
      </div>
      <div class="info-row">
        <span class="label">Monthly Rent:</span>
        <span class="value">${formatCurrency(data.monthlyRent)}</span>
      </div>
    </div>

    <p>You can access your tenant portal to:</p>
    <ul>
      <li>Pay rent online</li>
      <li>Submit maintenance requests</li>
      <li>View your lease documents</li>
      <li>Update your contact information</li>
    </ul>

    <a href="${APP_URL}/login" class="button">Access Tenant Portal</a>

    <p>If you have any questions, please don't hesitate to reach out to your property manager.</p>

    <p>Best regards,<br>The Strukture Team</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Welcome to ${data.propertyName}!`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    return false;
  }
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmation(
  to: string,
  data: PaymentConfirmationData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const content = `
    <h2>Payment Confirmation</h2>
    <p>Dear ${data.tenantName},</p>
    <p>Your payment has been successfully processed. Thank you!</p>

    <div class="info-box success">
      <div class="info-row">
        <span class="label">Amount Paid:</span>
        <span class="value">${formatCurrency(data.amount)}</span>
      </div>
      <div class="info-row">
        <span class="label">Payment Date:</span>
        <span class="value">${formatDate(data.paymentDate)}</span>
      </div>
      <div class="info-row">
        <span class="label">Payment Method:</span>
        <span class="value">${data.paymentMethod}</span>
      </div>
      ${
        data.transactionId
          ? `
      <div class="info-row">
        <span class="label">Transaction ID:</span>
        <span class="value">${data.transactionId}</span>
      </div>
      `
          : ''
      }
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName} - Unit ${data.unitNumber}</span>
      </div>
    </div>

    <p>You can view your payment history in your tenant portal.</p>

    <a href="${APP_URL}/tenant/payments" class="button">View Payment History</a>

    <p>Thank you for your prompt payment!</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Payment Confirmation - ${formatCurrency(data.amount)}`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send payment confirmation:', error);
    return false;
  }
}

/**
 * Send rent due reminder
 */
export async function sendRentDueReminder(
  to: string,
  data: RentDueReminderData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const content = `
    <h2>Rent Payment Reminder</h2>
    <p>Dear ${data.tenantName},</p>
    <p>This is a friendly reminder that your rent payment is due soon.</p>

    <div class="info-box highlight">
      <div class="info-row">
        <span class="label">Amount Due:</span>
        <span class="value">${formatCurrency(data.amount)}</span>
      </div>
      <div class="info-row">
        <span class="label">Due Date:</span>
        <span class="value">${formatDate(data.dueDate)}</span>
      </div>
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName} - Unit ${data.unitNumber}</span>
      </div>
    </div>

    <p>Please ensure your payment is submitted by the due date to avoid any late fees.</p>

    <a href="${APP_URL}/tenant/payments/new" class="button">Pay Now</a>

    <p>If you've already made this payment, please disregard this notice.</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Rent Due Reminder - ${formatDate(data.dueDate)}`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send rent reminder:', error);
    return false;
  }
}

/**
 * Send late payment notice
 */
export async function sendLatePaymentNotice(
  to: string,
  data: LatePaymentNoticeData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const totalDue = data.amount + (data.lateFee || 0);

  const content = `
    <h2>Late Payment Notice</h2>
    <p>Dear ${data.tenantName},</p>
    <p>Your rent payment is now past due. Please submit payment as soon as possible.</p>

    <div class="info-box urgent">
      <div class="info-row">
        <span class="label">Original Amount:</span>
        <span class="value">${formatCurrency(data.amount)}</span>
      </div>
      <div class="info-row">
        <span class="label">Due Date:</span>
        <span class="value">${formatDate(data.dueDate)}</span>
      </div>
      <div class="info-row">
        <span class="label">Days Overdue:</span>
        <span class="value">${data.daysLate} days</span>
      </div>
      ${
        data.lateFee
          ? `
      <div class="info-row">
        <span class="label">Late Fee:</span>
        <span class="value">${formatCurrency(data.lateFee)}</span>
      </div>
      `
          : ''
      }
      <div class="info-row">
        <span class="label"><strong>Total Due:</strong></span>
        <span class="value"><strong>${formatCurrency(totalDue)}</strong></span>
      </div>
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName} - Unit ${data.unitNumber}</span>
      </div>
    </div>

    <p>Please make your payment immediately to avoid additional late fees or further action.</p>

    <a href="${APP_URL}/tenant/payments/new" class="button">Pay Now</a>

    <p>If you're experiencing financial difficulties, please contact your property manager to discuss payment options.</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `URGENT: Late Payment Notice - ${data.daysLate} Days Overdue`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send late payment notice:', error);
    return false;
  }
}

/**
 * Send maintenance request submitted notification (to landlord)
 */
export async function sendMaintenanceSubmittedEmail(
  to: string,
  data: MaintenanceSubmittedData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const priorityClass = data.priority === 'EMERGENCY' ? 'urgent' : '';

  const content = `
    <h2>New Maintenance Request</h2>
    <p>Dear ${data.landlordName},</p>
    <p>A new maintenance request has been submitted by your tenant.</p>

    <div class="info-box ${priorityClass}">
      <div class="info-row">
        <span class="label">Title:</span>
        <span class="value">${data.requestTitle}</span>
      </div>
      <div class="info-row">
        <span class="label">Category:</span>
        <span class="value">${data.category}</span>
      </div>
      <div class="info-row">
        <span class="label">Priority:</span>
        <span class="value">${data.priority}</span>
      </div>
      <div class="info-row">
        <span class="label">Tenant:</span>
        <span class="value">${data.tenantName}</span>
      </div>
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName} - Unit ${data.unitNumber}</span>
      </div>
    </div>

    ${data.priority === 'EMERGENCY' ? '<p><strong>This is an EMERGENCY request and requires immediate attention.</strong></p>' : ''}

    <a href="${APP_URL}/landlord/maintenance/${data.requestId}" class="button">View Request</a>

    <p>Please review and acknowledge this request as soon as possible.</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${data.priority === 'EMERGENCY' ? '🚨 URGENT: ' : ''}New Maintenance Request - ${data.requestTitle}`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send maintenance submitted email:', error);
    return false;
  }
}

/**
 * Send maintenance update notification (to tenant)
 */
export async function sendMaintenanceUpdateEmail(
  to: string,
  data: MaintenanceUpdateData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const content = `
    <h2>Maintenance Request Update</h2>
    <p>Dear ${data.tenantName},</p>
    <p>There's an update on your maintenance request.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="label">Request:</span>
        <span class="value">${data.requestTitle}</span>
      </div>
      <div class="info-row">
        <span class="label">New Status:</span>
        <span class="value">${data.newStatus}</span>
      </div>
      ${
        data.scheduledDate
          ? `
      <div class="info-row">
        <span class="label">Scheduled Date:</span>
        <span class="value">${formatDate(data.scheduledDate)}</span>
      </div>
      `
          : ''
      }
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName} - Unit ${data.unitNumber}</span>
      </div>
    </div>

    ${data.message ? `<p><strong>Message from Property Manager:</strong></p><p>${data.message}</p>` : ''}

    <a href="${APP_URL}/tenant/maintenance/${data.requestId}" class="button">View Request</a>

    <p>If you have any questions, please contact your property manager.</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Maintenance Update - ${data.requestTitle}`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send maintenance update email:', error);
    return false;
  }
}

/**
 * Send lease expiration reminder
 */
export async function sendLeaseExpirationReminder(
  to: string,
  data: LeaseExpirationData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const content = `
    <h2>Lease Expiration Reminder</h2>
    <p>Dear ${data.tenantName},</p>
    <p>This is a reminder that your lease is expiring soon.</p>

    <div class="info-box highlight">
      <div class="info-row">
        <span class="label">Expiration Date:</span>
        <span class="value">${formatDate(data.expirationDate)}</span>
      </div>
      <div class="info-row">
        <span class="label">Days Remaining:</span>
        <span class="value">${data.daysRemaining} days</span>
      </div>
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName} - Unit ${data.unitNumber}</span>
      </div>
    </div>

    <p>Please contact your property manager to discuss lease renewal options or move-out procedures.</p>

    <a href="${APP_URL}/tenant/dashboard" class="button">View Lease Details</a>

    <p>If you have any questions about your lease or renewal options, please reach out to your property manager.</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Lease Expiring in ${data.daysRemaining} Days`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send lease expiration reminder:', error);
    return false;
  }
}
