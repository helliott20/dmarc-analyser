/**
 * Alerts service for creating and managing alerts
 *
 * This module handles alert creation and email notifications
 */

import { db } from '@/db';
import { alerts, alertRules, orgMembers, users, domains, organizations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendAlertEmail } from './email-service';

export type AlertType =
  | 'pass_rate_drop'
  | 'new_source'
  | 'dmarc_failure_spike'
  | 'dns_change'
  | 'auth_failure_spike'
  | 'policy_change'
  | 'compliance_drop';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface CreateAlertParams {
  organizationId: string;
  domainId?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create an alert and optionally send email notifications
 */
export async function createAlert(params: CreateAlertParams): Promise<{ alertId: string; emailSent: boolean }> {
  const { organizationId, domainId, type, severity, title, message, metadata } = params;

  // Create the alert
  const [alert] = await db
    .insert(alerts)
    .values({
      organizationId,
      domainId: domainId || null,
      type,
      severity,
      title,
      message,
      metadata: metadata || null,
    })
    .returning();

  // Check if there's a matching alert rule that wants email notifications
  const rules = await db
    .select()
    .from(alertRules)
    .where(
      and(
        eq(alertRules.organizationId, organizationId),
        eq(alertRules.type, type),
        eq(alertRules.isEnabled, true),
        eq(alertRules.notifyEmail, true)
      )
    );

  // Check if any rule matches (either org-wide or domain-specific)
  const matchingRule = rules.find((rule) => {
    if (!rule.domainId) return true; // Org-wide rule
    if (domainId && rule.domainId === domainId) return true; // Domain-specific
    return false;
  });

  if (!matchingRule) {
    return { alertId: alert.id, emailSent: false };
  }

  // Get domain name if applicable
  let domainName: string | undefined;
  if (domainId) {
    const [domain] = await db
      .select({ domain: domains.domain })
      .from(domains)
      .where(eq(domains.id, domainId))
      .limit(1);
    domainName = domain?.domain;
  }

  // Get org members who should receive alert emails
  // For now, notify all admins and owners
  const membersToNotify = await db
    .select({
      email: users.email,
      name: users.name,
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(
      and(
        eq(orgMembers.organizationId, organizationId),
        // Only notify owners and admins
        // Could be enhanced to check user preferences
      )
    );

  const adminMembers = membersToNotify.filter((m) => m.email);
  const recipientEmails = adminMembers.map((m) => m.email).filter(Boolean) as string[];

  if (recipientEmails.length === 0) {
    return { alertId: alert.id, emailSent: false };
  }

  // Send email notification (non-blocking)
  const emailResult = await sendAlertEmail({
    organizationId,
    recipientEmail: recipientEmails,
    alertTitle: title,
    alertMessage: message,
    severity,
    domainName,
    alertId: alert.id,
  });

  // Update alert to mark email as sent
  if (emailResult.success) {
    await db
      .update(alerts)
      .set({ emailSent: true })
      .where(eq(alerts.id, alert.id));
  }

  return { alertId: alert.id, emailSent: emailResult.success };
}

/**
 * Check pass rate and create alert if it drops below threshold
 */
export async function checkPassRateAlert(params: {
  organizationId: string;
  domainId: string;
  currentPassRate: number;
  previousPassRate: number;
}): Promise<void> {
  const { organizationId, domainId, currentPassRate, previousPassRate } = params;

  // Get the alert rule for pass rate drops
  const [rule] = await db
    .select()
    .from(alertRules)
    .where(
      and(
        eq(alertRules.organizationId, organizationId),
        eq(alertRules.type, 'pass_rate_drop'),
        eq(alertRules.isEnabled, true)
      )
    )
    .limit(1);

  if (!rule) return;

  // Get threshold from rule, default to 10% drop
  const threshold = (rule.threshold as any)?.dropPercent || 10;
  const dropPercent = previousPassRate - currentPassRate;

  if (dropPercent >= threshold) {
    // Get domain name
    const [domain] = await db
      .select({ domain: domains.domain })
      .from(domains)
      .where(eq(domains.id, domainId))
      .limit(1);

    const severity: AlertSeverity =
      dropPercent >= 30 ? 'critical' : dropPercent >= 15 ? 'warning' : 'info';

    await createAlert({
      organizationId,
      domainId,
      type: 'pass_rate_drop',
      severity,
      title: `Pass rate dropped by ${dropPercent.toFixed(1)}%`,
      message: `The DMARC pass rate for ${domain?.domain || 'your domain'} dropped from ${previousPassRate.toFixed(1)}% to ${currentPassRate.toFixed(1)}%, a decrease of ${dropPercent.toFixed(1)} percentage points.`,
      metadata: {
        currentPassRate,
        previousPassRate,
        dropPercent,
      },
    });
  }
}

/**
 * Create alert for a new email source
 */
export async function createNewSourceAlert(params: {
  organizationId: string;
  domainId: string;
  sourceIp: string;
  hostname?: string;
  organization?: string;
  country?: string;
}): Promise<void> {
  const { organizationId, domainId, sourceIp, hostname, organization: sourceOrg, country } = params;

  // Get domain name
  const [domain] = await db
    .select({ domain: domains.domain })
    .from(domains)
    .where(eq(domains.id, domainId))
    .limit(1);

  const sourceInfo = [hostname, sourceOrg, country].filter(Boolean).join(' • ') || sourceIp;

  await createAlert({
    organizationId,
    domainId,
    type: 'new_source',
    severity: 'info',
    title: `New email source detected`,
    message: `A new IP address (${sourceIp}) has been detected sending email as ${domain?.domain || 'your domain'}. Source info: ${sourceInfo}. Review and classify this source.`,
    metadata: {
      sourceIp,
      hostname,
      organization: sourceOrg,
      country,
    },
  });
}

/**
 * Create alert for DNS record changes
 */
export async function createDnsChangeAlert(params: {
  organizationId: string;
  domainId: string;
  recordType: 'SPF' | 'DKIM' | 'DMARC';
  oldValue?: string;
  newValue?: string;
}): Promise<void> {
  const { organizationId, domainId, recordType, oldValue, newValue } = params;

  // Get domain name
  const [domain] = await db
    .select({ domain: domains.domain })
    .from(domains)
    .where(eq(domains.id, domainId))
    .limit(1);

  const changeType = !oldValue ? 'added' : !newValue ? 'removed' : 'changed';

  await createAlert({
    organizationId,
    domainId,
    type: 'dns_change',
    severity: !newValue ? 'critical' : 'warning',
    title: `${recordType} record ${changeType}`,
    message: `The ${recordType} record for ${domain?.domain || 'your domain'} has been ${changeType}. ${oldValue ? `Previous: ${oldValue}` : ''} ${newValue ? `New: ${newValue}` : 'The record has been removed.'}`,
    metadata: {
      recordType,
      oldValue,
      newValue,
    },
  });
}
