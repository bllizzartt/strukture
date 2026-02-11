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

// ==================== Lease Invite ====================

export interface LeaseInviteData {
  tenantEmail: string;
  landlordName: string;
  propertyName: string;
  unitNumber: string;
  propertyAddress: string;
  monthlyRent: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
  leaseId: string;
}

/**
 * Send lease signing invite to tenant
 */
export async function sendLeaseInviteEmail(to: string, data: LeaseInviteData): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const signUrl = `${APP_URL}/lease/sign/${data.leaseId}`;

  const content = `
    <h2>You've Been Invited to Sign a Lease</h2>
    <p>Hello,</p>
    <p>${data.landlordName} has prepared a lease agreement for you at <strong>${data.propertyName}</strong>.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName} - Unit ${data.unitNumber}</span>
      </div>
      <div class="info-row">
        <span class="label">Address:</span>
        <span class="value">${data.propertyAddress}</span>
      </div>
      <div class="info-row">
        <span class="label">Monthly Rent:</span>
        <span class="value">${formatCurrency(data.monthlyRent)}</span>
      </div>
      <div class="info-row">
        <span class="label">Security Deposit:</span>
        <span class="value">${formatCurrency(data.depositAmount)}</span>
      </div>
      <div class="info-row">
        <span class="label">Lease Period:</span>
        <span class="value">${formatDate(data.startDate)} - ${formatDate(data.endDate)}</span>
      </div>
    </div>

    <p>Please click the button below to review the lease agreement and sign electronically.</p>

    <a href="${signUrl}" class="button">Review & Sign Lease</a>

    <div class="highlight">
      <p><strong>What to expect:</strong></p>
      <ul>
        <li>If you don't have an account, you'll be asked to create one</li>
        <li>Review the full lease agreement with all terms</li>
        <li>Sign electronically using your mouse or touchscreen</li>
      </ul>
    </div>

    <p>If you have questions about the lease terms, please contact ${data.landlordName} directly before signing.</p>
  `;

  try {
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Lease Agreement Ready to Sign - ${data.propertyName} Unit ${data.unitNumber}`,
      html: baseTemplate(content),
    });
    if (error) {
      console.error(`Failed to send lease invite email to ${to}:`, error);
      return false;
    }
    console.log(`Lease invite email sent successfully to ${to} (id: ${result?.id})`);
    return true;
  } catch (error) {
    console.error(`Failed to send lease invite email to ${to}:`, error);
    return false;
  }
}

// ==================== Tenant Signed Notification (to Landlord) ====================

export interface TenantSignedData {
  landlordName: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  leaseId: string;
}

/**
 * Notify landlord that tenant has signed the lease
 */
export async function sendTenantSignedEmail(to: string, data: TenantSignedData): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const signUrl = `${APP_URL}/lease/sign/${data.leaseId}`;

  const content = `
    <h2>Tenant Has Signed the Lease</h2>
    <p>Dear ${data.landlordName},</p>
    <p><strong>${data.tenantName}</strong> has signed the lease agreement for <strong>${data.propertyName} - Unit ${data.unitNumber}</strong>.</p>

    <div class="info-box success">
      <p><strong>Your counter-signature is needed to activate the lease.</strong></p>
      <p>Please review the lease and add your signature to finalize the agreement.</p>
    </div>

    <a href="${signUrl}" class="button">Review & Counter-Sign</a>

    <p>Once both signatures are in place, the lease will automatically become active and the unit will be marked as occupied.</p>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Action Required: Counter-Sign Lease - ${data.propertyName} Unit ${data.unitNumber}`,
      html: baseTemplate(content),
    });
    if (error) {
      console.error(`Failed to send tenant signed notification to ${to}:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Failed to send tenant signed notification to ${to}:`, error);
    return false;
  }
}

// ==================== Lease Fully Signed (to both parties) ====================

export interface LeaseFullySignedData {
  landlordName: string;
  landlordEmail: string;
  tenantName: string;
  tenantEmail: string;
  propertyName: string;
  unitNumber: string;
  propertyAddress: string;
  startDate: string;
  endDate: string;
  leaseId: string;
}

/**
 * Send signed lease notification to both landlord and tenant
 */
export async function sendLeaseFullySignedEmail(data: LeaseFullySignedData): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const leaseUrl = `${APP_URL}/lease/sign/${data.leaseId}`;

  const makeContent = (recipientName: string, isLandlord: boolean) => `
    <h2>Lease Agreement Fully Signed</h2>
    <p>Dear ${recipientName},</p>
    <p>Great news! The lease agreement for <strong>${data.propertyName} - Unit ${data.unitNumber}</strong> has been signed by both parties and is now <strong>active</strong>.</p>

    <div class="info-box success">
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName} - Unit ${data.unitNumber}</span>
      </div>
      <div class="info-row">
        <span class="label">Address:</span>
        <span class="value">${data.propertyAddress}</span>
      </div>
      <div class="info-row">
        <span class="label">Landlord:</span>
        <span class="value">${data.landlordName}</span>
      </div>
      <div class="info-row">
        <span class="label">Tenant:</span>
        <span class="value">${data.tenantName}</span>
      </div>
      <div class="info-row">
        <span class="label">Lease Period:</span>
        <span class="value">${formatDate(data.startDate)} - ${formatDate(data.endDate)}</span>
      </div>
      <div class="info-row">
        <span class="label">Status:</span>
        <span class="value" style="color: #10b981;">Active</span>
      </div>
    </div>

    <p>You can download a PDF copy of the signed lease from the link below.</p>

    <a href="${leaseUrl}" class="button">View Signed Lease</a>

    <div class="highlight">
      <p><strong>Important:</strong> This lease was signed electronically in compliance with the ESIGN Act (15 U.S.C. §§ 7001-7006) and the New Mexico Uniform Electronic Transactions Act (NMSA 1978, §§ 14-16-1 to 14-16-21). A complete audit trail of all signatures, including timestamps, IP addresses, and consent records, has been securely stored.</p>
    </div>

    ${isLandlord ? '<p>The unit has been automatically marked as occupied in your dashboard.</p>' : '<p>Welcome to your new home! You can access your tenant portal to manage your lease, submit maintenance requests, and pay rent.</p>'}
  `;

  try {
    // Send to both landlord and tenant in parallel
    const results = await Promise.allSettled([
      resend.emails.send({
        from: FROM_EMAIL,
        to: data.landlordEmail,
        subject: `Lease Active - ${data.propertyName} Unit ${data.unitNumber}`,
        html: baseTemplate(makeContent(data.landlordName, true)),
      }),
      resend.emails.send({
        from: FROM_EMAIL,
        to: data.tenantEmail,
        subject: `Lease Active - ${data.propertyName} Unit ${data.unitNumber}`,
        html: baseTemplate(makeContent(data.tenantName, false)),
      }),
    ]);

    for (const [i, result] of results.entries()) {
      const recipient = i === 0 ? data.landlordEmail : data.tenantEmail;
      if (result.status === 'rejected') {
        console.error(`Failed to send lease active email to ${recipient}:`, result.reason);
      } else if (result.value.error) {
        console.error(`Failed to send lease active email to ${recipient}:`, result.value.error);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to send lease fully signed emails:', error);
    return false;
  }
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

export interface ApplicationSubmittedData {
  landlordName: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  propertyName: string;
  unitNumber?: string;
  monthlyIncome?: string;
  desiredMoveIn?: string;
  numberOfDocuments: number;
  applicationId: string;
}

export interface ViewingRequestEmailData {
  landlordName: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  message?: string;
  propertyName: string;
  propertyAddress: string;
  unitNumber?: string;
  preferredDate1: string;
  preferredDate2?: string;
  preferredDate3?: string;
}

export interface ApplicationConfirmationData {
  applicantName: string;
  propertyName: string;
  propertyAddress: string;
  unitNumber?: string;
  landlordName: string;
  submittedAt: string;
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

/**
 * Send new rental application notification to landlord
 */
export async function sendApplicationSubmittedEmail(
  to: string,
  data: ApplicationSubmittedData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const content = `
    <h2>New Rental Application Received</h2>
    <p>Dear ${data.landlordName},</p>
    <p>A new rental application has been submitted for <strong>${data.propertyName}</strong>.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="label">Applicant:</span>
        <span class="value">${data.applicantName}</span>
      </div>
      <div class="info-row">
        <span class="label">Email:</span>
        <span class="value">${data.applicantEmail}</span>
      </div>
      <div class="info-row">
        <span class="label">Phone:</span>
        <span class="value">${data.applicantPhone}</span>
      </div>
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName}${data.unitNumber ? ` - Unit ${data.unitNumber}` : ''}</span>
      </div>
      ${data.monthlyIncome ? `
      <div class="info-row">
        <span class="label">Monthly Income:</span>
        <span class="value">$${parseFloat(data.monthlyIncome).toLocaleString()}</span>
      </div>
      ` : ''}
      ${data.desiredMoveIn ? `
      <div class="info-row">
        <span class="label">Desired Move-In:</span>
        <span class="value">${formatDate(data.desiredMoveIn)}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="label">Documents Uploaded:</span>
        <span class="value">${data.numberOfDocuments} file(s)</span>
      </div>
    </div>

    <p>Please review the full application, uploaded documents, and consider running a background/credit check.</p>

    <a href="${APP_URL}/landlord/applications/${data.applicationId}" class="button">Review Application</a>

    <p>You can approve, deny, or request additional information from within the portal.</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `New Application: ${data.applicantName} - ${data.propertyName}${data.unitNumber ? ` Unit ${data.unitNumber}` : ''}`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send application submitted email:', error);
    return false;
  }
}

/**
 * Send application confirmation email to the applicant
 */
export async function sendApplicationConfirmationEmail(
  to: string,
  data: ApplicationConfirmationData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const content = `
    <h2>Application Received</h2>
    <p>Dear ${data.applicantName},</p>
    <p>Thank you for submitting your rental application. We wanted to confirm that your application has been received and is now <strong>being reviewed</strong>.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName}${data.unitNumber ? ` - Unit ${data.unitNumber}` : ''}</span>
      </div>
      <div class="info-row">
        <span class="label">Address:</span>
        <span class="value">${data.propertyAddress}</span>
      </div>
      <div class="info-row">
        <span class="label">Property Manager:</span>
        <span class="value">${data.landlordName}</span>
      </div>
      <div class="info-row">
        <span class="label">Submitted:</span>
        <span class="value">${formatDate(data.submittedAt)}</span>
      </div>
      <div class="info-row">
        <span class="label">Status:</span>
        <span class="value">In Review</span>
      </div>
    </div>

    <h3>What happens next?</h3>
    <ol>
      <li>The property manager will review your application and uploaded documents</li>
      <li>A background and credit check may be conducted (you consented to this during the application)</li>
      <li>You will be contacted via email or phone with the decision</li>
    </ol>

    <div class="highlight">
      <p><strong>Please do not submit duplicate applications.</strong> If you need to provide additional documents or update your information, contact the property manager directly.</p>
    </div>

    <p>If you have any questions about your application status, please reach out to ${data.landlordName}.</p>

    <p>Thank you for your interest,<br>The Strukture Team</p>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Application Received - ${data.propertyName}${data.unitNumber ? ` Unit ${data.unitNumber}` : ''}`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send application confirmation email:', error);
    return false;
  }
}

/**
 * Send viewing request notification to landlord
 */
export async function sendViewingRequestEmail(
  to: string,
  data: ViewingRequestEmailData
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const content = `
    <h2>New Viewing Request</h2>
    <p>Dear ${data.landlordName},</p>
    <p>Someone would like to schedule a viewing of <strong>${data.propertyName}</strong>.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="label">Name:</span>
        <span class="value">${data.visitorName}</span>
      </div>
      <div class="info-row">
        <span class="label">Email:</span>
        <span class="value">${data.visitorEmail}</span>
      </div>
      <div class="info-row">
        <span class="label">Phone:</span>
        <span class="value">${data.visitorPhone}</span>
      </div>
      <div class="info-row">
        <span class="label">Property:</span>
        <span class="value">${data.propertyName}${data.unitNumber ? ` - Unit ${data.unitNumber}` : ''}</span>
      </div>
      <div class="info-row">
        <span class="label">Address:</span>
        <span class="value">${data.propertyAddress}</span>
      </div>
    </div>

    <h3>Preferred Dates</h3>
    <div class="info-box">
      <div class="info-row">
        <span class="label">1st Choice:</span>
        <span class="value">${formatDate(data.preferredDate1)}</span>
      </div>
      ${data.preferredDate2 ? `
      <div class="info-row">
        <span class="label">2nd Choice:</span>
        <span class="value">${formatDate(data.preferredDate2)}</span>
      </div>
      ` : ''}
      ${data.preferredDate3 ? `
      <div class="info-row">
        <span class="label">3rd Choice:</span>
        <span class="value">${formatDate(data.preferredDate3)}</span>
      </div>
      ` : ''}
    </div>

    ${data.message ? `
    <h3>Message from Visitor</h3>
    <div class="info-box">
      <p>${data.message}</p>
    </div>
    ` : ''}

    <p>Please contact the visitor to confirm a date and time. You can reply directly to their email or call them.</p>

    <a href="mailto:${data.visitorEmail}?subject=Viewing Confirmation - ${encodeURIComponent(data.propertyName)}" class="button">Reply to ${data.visitorName}</a>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Viewing Request: ${data.visitorName} - ${data.propertyName}${data.unitNumber ? ` Unit ${data.unitNumber}` : ''}`,
      html: baseTemplate(content),
    });
    return true;
  } catch (error) {
    console.error('Failed to send viewing request email:', error);
    return false;
  }
}
