/**
 * Email service for sending branded emails via Gmail
 */

import { db } from '@/db';
import { organizations, gmailAccounts, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendEmailViaGmail, getOrgSendingAccount } from './gmail';

/**
 * Get the app base URL from environment variables
 */
function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
}
import {
  generateInvitationEmail,
  generateAlertEmail,
  generateWelcomeEmail,
  generateReportEmail,
  generateTestEmail,
  type OrgBranding,
  type InvitationEmailOptions,
  type AlertEmailOptions,
  type WelcomeEmailOptions,
  type ReportEmailOptions,
} from './email-templates';

/**
 * Get org branding info for email templates
 */
async function getOrgBranding(organizationId: string): Promise<OrgBranding | null> {
  const [org] = await db
    .select({
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      primaryColor: organizations.primaryColor,
      accentColor: organizations.accentColor,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  return org || null;
}

/**
 * Send an email using the org's Gmail account
 * Returns true if sent successfully, false if no sending account configured
 */
async function sendOrgEmail(
  organizationId: string,
  to: string | string[],
  subject: string,
  html: string,
  text?: string
): Promise<{ success: boolean; error?: string }> {
  // Get the sending account for this org
  const sendingAccount = await getOrgSendingAccount(organizationId);

  if (!sendingAccount) {
    console.log(`[EmailService] No sending account configured for org ${organizationId}`);
    return { success: false, error: 'No Gmail account configured for sending' };
  }

  try {
    await sendEmailViaGmail(sendingAccount.id, {
      to,
      subject,
      html,
      text,
    });
    return { success: true };
  } catch (error) {
    console.error('[EmailService] Failed to send email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
  }
}

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

/**
 * Send an invitation email
 */
export async function sendInvitationEmail(params: {
  organizationId: string;
  inviterId: string;
  recipientEmail: string;
  role: string;
  token: string;
}): Promise<{ success: boolean; error?: string }> {
  const { organizationId, inviterId, recipientEmail, role, token } = params;

  // Get org branding
  const org = await getOrgBranding(organizationId);
  if (!org) {
    return { success: false, error: 'Organisation not found' };
  }

  // Get inviter info
  const [inviter] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, inviterId))
    .limit(1);

  const inviteUrl = `${getAppUrl()}/invite/${token}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  const { html, text, subject } = generateInvitationEmail({
    org,
    inviterName: inviter?.name || 'A team member',
    inviterEmail: inviter?.email || '',
    recipientEmail,
    role,
    inviteUrl,
    expiresAt,
  });

  return sendOrgEmail(organizationId, recipientEmail, subject, html, text);
}

/**
 * Send an alert notification email
 */
export async function sendAlertEmail(params: {
  organizationId: string;
  recipientEmail: string | string[];
  alertTitle: string;
  alertMessage: string;
  severity: 'info' | 'warning' | 'critical';
  domainName?: string;
  alertId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { organizationId, recipientEmail, alertTitle, alertMessage, severity, domainName, alertId } = params;

  // Get org branding
  const org = await getOrgBranding(organizationId);
  if (!org) {
    return { success: false, error: 'Organisation not found' };
  }

  // Get org slug for URL
  const [orgData] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const alertUrl = `${getAppUrl()}/orgs/${orgData?.slug}/alerts`;

  const { html, text, subject } = generateAlertEmail({
    org,
    alertTitle,
    alertMessage,
    severity,
    domainName,
    alertUrl,
    timestamp: new Date(),
  });

  return sendOrgEmail(organizationId, recipientEmail, subject, html, text);
}

/**
 * Send a welcome email after joining an org
 */
export async function sendWelcomeEmail(params: {
  organizationId: string;
  userId: string;
  role: string;
}): Promise<{ success: boolean; error?: string }> {
  const { organizationId, userId, role } = params;

  // Get org branding and slug
  const [orgData] = await db
    .select({
      name: organizations.name,
      slug: organizations.slug,
      logoUrl: organizations.logoUrl,
      primaryColor: organizations.primaryColor,
      accentColor: organizations.accentColor,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!orgData) {
    return { success: false, error: 'Organisation not found' };
  }

  // Get user info
  const [user] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.email) {
    return { success: false, error: 'User not found' };
  }

  const dashboardUrl = `${getAppUrl()}/orgs/${orgData.slug}`;

  const { html, text, subject } = generateWelcomeEmail({
    org: orgData,
    userName: user.name || '',
    role,
    dashboardUrl,
  });

  return sendOrgEmail(organizationId, user.email, subject, html, text);
}

/**
 * Send a scheduled report email
 */
export async function sendScheduledReportEmail(params: {
  organizationId: string;
  recipients: string[];
  reportName: string;
  periodStart: Date;
  periodEnd: Date;
  domainName?: string;
  domainId?: string;
  summary: {
    totalMessages: number;
    passRate: number;
    failedMessages: number;
    newSources: number;
  };
}): Promise<{ success: boolean; error?: string }> {
  const { organizationId, recipients, reportName, periodStart, periodEnd, domainName, domainId, summary } = params;

  // Get org branding and slug
  const [orgData] = await db
    .select({
      name: organizations.name,
      slug: organizations.slug,
      logoUrl: organizations.logoUrl,
      primaryColor: organizations.primaryColor,
      accentColor: organizations.accentColor,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!orgData) {
    return { success: false, error: 'Organisation not found' };
  }

  // Build report URL
  let reportUrl = `${getAppUrl()}/orgs/${orgData.slug}`;
  if (domainId) {
    reportUrl += `/domains/${domainId}`;
  }

  const { html, text, subject } = generateReportEmail({
    org: orgData,
    reportName,
    periodStart,
    periodEnd,
    domainName,
    summary,
    reportUrl,
  });

  return sendOrgEmail(organizationId, recipients, subject, html, text);
}

/**
 * Send a branded test email
 */
export async function sendBrandedTestEmail(params: {
  organizationId: string;
  recipientEmail: string;
  gmailAccountId?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { organizationId, recipientEmail, gmailAccountId } = params;

  // Get org branding
  const org = await getOrgBranding(organizationId);
  if (!org) {
    return { success: false, error: 'Organisation not found' };
  }

  const { html, text, subject } = generateTestEmail({ org });

  // If specific account provided, use it; otherwise use default org account
  if (gmailAccountId) {
    try {
      await sendEmailViaGmail(gmailAccountId, {
        to: recipientEmail,
        subject,
        html,
        text,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to send email' };
    }
  }

  return sendOrgEmail(organizationId, recipientEmail, subject, html, text);
}
