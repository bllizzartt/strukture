import { Telegraf } from 'telegraf';

// Lazy initialization to avoid build-time errors
let botInstance: Telegraf | null = null;

function getBot(): Telegraf | null {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('TELEGRAM_BOT_TOKEN is not set - Telegram notifications disabled');
    return null;
  }

  if (!botInstance) {
    botInstance = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  }

  return botInstance;
}

export interface MaintenanceNotification {
  requestId: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  entryPermission: boolean;
}

export interface PaymentNotification {
  paymentId: string;
  amount: number;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  paymentMethod: string;
}

export interface ViewingNotification {
  viewingId: string;
  visitorName: string;
  visitorPhone: string;
  propertyName: string;
  unitNumber?: string;
  preferredDate1: string;
}

export interface ApplicationNotification {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  propertyName: string;
  unitNumber?: string;
  numberOfDocuments: number;
}

export interface LeaseNotification {
  leaseId: string;
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
}

// Format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Priority emoji mapping
function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case 'EMERGENCY':
      return '🚨';
    case 'HIGH':
      return '⚠️';
    case 'MEDIUM':
      return '📋';
    case 'LOW':
      return '📝';
    default:
      return '📋';
  }
}

// Category emoji mapping
function getCategoryEmoji(category: string): string {
  switch (category) {
    case 'PLUMBING':
      return '🚰';
    case 'ELECTRICAL':
      return '⚡';
    case 'HVAC':
      return '❄️';
    case 'APPLIANCE':
      return '🔌';
    case 'STRUCTURAL':
      return '🏗️';
    case 'PEST':
      return '🐛';
    case 'SAFETY':
      return '🔒';
    case 'EXTERIOR':
      return '🏠';
    case 'OTHER':
      return '🔧';
    default:
      return '🔧';
  }
}

/**
 * Send a new maintenance request notification
 */
export async function sendMaintenanceNotification(
  chatId: string,
  data: MaintenanceNotification
): Promise<boolean> {
  const bot = getBot();
  if (!bot) return false;

  const priorityEmoji = getPriorityEmoji(data.priority);
  const categoryEmoji = getCategoryEmoji(data.category);

  const message = `
${priorityEmoji} *New Maintenance Request*

*Title:* ${escapeMarkdown(data.title)}
*Category:* ${categoryEmoji} ${escapeMarkdown(formatLabel(data.category))}
*Priority:* ${escapeMarkdown(formatLabel(data.priority))}

*Property:* ${escapeMarkdown(data.propertyName)}
*Unit:* ${escapeMarkdown(data.unitNumber)}
*Tenant:* ${escapeMarkdown(data.tenantName)}

*Description:*
${escapeMarkdown(data.description.substring(0, 500))}${data.description.length > 500 ? '...' : ''}

*Entry Permission:* ${data.entryPermission ? '✅ Yes' : '❌ No'}

[View Request](${process.env.NEXTAUTH_URL}/landlord/maintenance/${data.requestId})
`.trim();

  try {
    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });
    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}

/**
 * Send a payment received notification
 */
export async function sendPaymentNotification(
  chatId: string,
  data: PaymentNotification
): Promise<boolean> {
  const bot = getBot();
  if (!bot) return false;

  const message = `
💰 *Payment Received*

*Amount:* ${formatCurrency(data.amount)}
*Method:* ${escapeMarkdown(formatLabel(data.paymentMethod))}

*Property:* ${escapeMarkdown(data.propertyName)}
*Unit:* ${escapeMarkdown(data.unitNumber)}
*Tenant:* ${escapeMarkdown(data.tenantName)}

[View Payment](${process.env.NEXTAUTH_URL}/landlord/payments)
`.trim();

  try {
    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });
    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}

/**
 * Send a new lease signed notification
 */
export async function sendLeaseNotification(
  chatId: string,
  data: LeaseNotification
): Promise<boolean> {
  const bot = getBot();
  if (!bot) return false;

  const message = `
📝 *New Lease Signed*

*Tenant:* ${escapeMarkdown(data.tenantName)}
*Property:* ${escapeMarkdown(data.propertyName)}
*Unit:* ${escapeMarkdown(data.unitNumber)}

*Lease Period:* ${escapeMarkdown(data.startDate)} - ${escapeMarkdown(data.endDate)}
*Monthly Rent:* ${formatCurrency(data.monthlyRent)}

[View Lease](${process.env.NEXTAUTH_URL}/landlord/tenants)
`.trim();

  try {
    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });
    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}

/**
 * Send a viewing request notification
 */
export async function sendViewingNotification(
  chatId: string,
  data: ViewingNotification
): Promise<boolean> {
  const bot = getBot();
  if (!bot) return false;

  const message = `
🏠 *Viewing Request*

*Visitor:* ${escapeMarkdown(data.visitorName)}
*Phone:* ${escapeMarkdown(data.visitorPhone)}

*Property:* ${escapeMarkdown(data.propertyName)}${data.unitNumber ? `\n*Unit:* ${escapeMarkdown(data.unitNumber)}` : ''}

*Preferred Date:* ${escapeMarkdown(new Date(data.preferredDate1).toLocaleDateString())}

Please contact them to confirm a time\\.
`.trim();

  try {
    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'MarkdownV2',
      link_preview_options: { is_disabled: true },
    });
    return true;
  } catch (error) {
    console.error('Failed to send Telegram viewing notification:', error);
    return false;
  }
}

/**
 * Send a new rental application notification
 */
export async function sendApplicationNotification(
  chatId: string,
  data: ApplicationNotification
): Promise<boolean> {
  const bot = getBot();
  if (!bot) return false;

  const message = `
📋 *New Rental Application*

*Applicant:* ${escapeMarkdown(data.applicantName)}
*Email:* ${escapeMarkdown(data.applicantEmail)}

*Property:* ${escapeMarkdown(data.propertyName)}${data.unitNumber ? `\n*Unit:* ${escapeMarkdown(data.unitNumber)}` : ''}

*Documents:* ${data.numberOfDocuments} file(s) uploaded

[Review Application](${process.env.NEXTAUTH_URL}/landlord/applications/${data.applicationId})
`.trim();

  try {
    await bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      link_preview_options: { is_disabled: true },
    });
    return true;
  } catch (error) {
    console.error('Failed to send Telegram application notification:', error);
    return false;
  }
}

/**
 * Send a generic notification message
 */
export async function sendNotification(
  chatId: string,
  title: string,
  message: string
): Promise<boolean> {
  const bot = getBot();
  if (!bot) return false;

  const formattedMessage = `
📢 *${escapeMarkdown(title)}*

${escapeMarkdown(message)}
`.trim();

  try {
    await bot.telegram.sendMessage(chatId, formattedMessage, {
      parse_mode: 'Markdown',
    });
    return true;
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
    return false;
  }
}

/**
 * Verify a Telegram chat ID is valid
 */
export async function verifyChatId(chatId: string): Promise<boolean> {
  const bot = getBot();
  if (!bot) return false;

  try {
    await bot.telegram.sendMessage(
      chatId,
      '✅ *Strukture Connected*\n\nYou will now receive notifications for your properties.',
      { parse_mode: 'Markdown' }
    );
    return true;
  } catch (error) {
    console.error('Failed to verify Telegram chat ID:', error);
    return false;
  }
}

// Helper to escape markdown special characters
function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

// Helper to format enum labels
function formatLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}
