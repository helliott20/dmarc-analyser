/**
 * Branded email templates for DMARC Analyser
 *
 * These templates use org branding (logo, colors) when available
 */

export interface OrgBranding {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
}

interface BaseTemplateOptions {
  org: OrgBranding;
  previewText?: string;
}

/**
 * Generate the base email template with org branding
 */
function getBaseTemplate(options: BaseTemplateOptions, content: string): string {
  const { org, previewText } = options;
  const primaryColor = org.primaryColor || '#3B82F6';
  const accentColor = org.accentColor || '#10B981';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${org.name}</title>
  ${previewText ? `<!--[if !mso]><!--><meta name="x-apple-disable-message-reformatting"><!--<![endif]-->` : ''}
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      background-color: #f4f4f5;
    }
    /* Responsive styles */
    @media screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .content {
        padding: 24px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${previewText ? `<div style="display: none; max-height: 0; overflow: hidden;">${previewText}</div>` : ''}

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="max-width: 600px; width: 100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              ${org.logoUrl ? `
                <img src="${org.logoUrl}" alt="${org.name}" height="40" style="height: 40px; width: auto;">
              ` : `
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color: ${primaryColor}; border-radius: 8px; padding: 8px 12px;">
                      <span style="color: #ffffff; font-size: 18px; font-weight: 600;">${org.name}</span>
                    </td>
                  </tr>
                </table>
              `}
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <tr>
                  <td class="content" style="padding: 32px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.5;">
                Sent by ${org.name} via DMARC Analyser
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #a1a1aa;">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate a primary action button
 */
function getButton(text: string, url: string, primaryColor: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td style="background-color: ${primaryColor}; border-radius: 8px;">
          <a href="${url}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Generate an info box
 */
function getInfoBox(content: string, bgColor: string = '#f0f9ff', borderColor: string = '#3b82f6'): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 16px 0;">
      <tr>
        <td style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0; padding: 16px;">
          ${content}
        </td>
      </tr>
    </table>
  `;
}

// ============================================
// INVITATION EMAIL
// ============================================

export interface InvitationEmailOptions {
  org: OrgBranding;
  inviterName: string;
  inviterEmail: string;
  recipientEmail: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}

export function generateInvitationEmail(options: InvitationEmailOptions): { html: string; text: string; subject: string } {
  const { org, inviterName, inviterEmail, recipientEmail, role, inviteUrl, expiresAt } = options;
  const primaryColor = org.primaryColor || '#3B82F6';

  const roleDisplay = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member',
    viewer: 'Viewer',
  }[role] || role;

  const expiresFormatted = expiresAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const content = `
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
      You've been invited!
    </h1>

    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
      <strong>${inviterName || inviterEmail}</strong> has invited you to join <strong>${org.name}</strong> as ${roleDisplay === 'Owner' || roleDisplay === 'Administrator' ? 'an' : 'a'} <strong>${roleDisplay}</strong>.
    </p>

    ${getInfoBox(`
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding-bottom: 8px;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Organisation</span><br>
            <span style="font-size: 14px; color: #18181b; font-weight: 500;">${org.name}</span>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom: 8px;">
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Your Role</span><br>
            <span style="font-size: 14px; color: #18181b; font-weight: 500;">${roleDisplay}</span>
          </td>
        </tr>
        <tr>
          <td>
            <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Expires</span><br>
            <span style="font-size: 14px; color: #18181b; font-weight: 500;">${expiresFormatted}</span>
          </td>
        </tr>
      </table>
    `, '#f0f9ff', primaryColor)}

    <p style="margin: 0; font-size: 14px; color: #52525b; line-height: 1.6;">
      Click the button below to accept this invitation and join the organisation.
    </p>

    ${getButton('Accept Invitation', inviteUrl, primaryColor)}

    <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${inviteUrl}" style="color: ${primaryColor}; word-break: break-all;">${inviteUrl}</a>
    </p>
  `;

  const text = `
You've been invited to ${org.name}!

${inviterName || inviterEmail} has invited you to join ${org.name} as ${roleDisplay === 'Owner' || roleDisplay === 'Administrator' ? 'an' : 'a'} ${roleDisplay}.

Organisation: ${org.name}
Your Role: ${roleDisplay}
Expires: ${expiresFormatted}

Accept your invitation here:
${inviteUrl}

This invitation will expire on ${expiresFormatted}.

---
Sent by ${org.name} via DMARC Analyser
  `.trim();

  return {
    html: getBaseTemplate({ org, previewText: `${inviterName || inviterEmail} invited you to join ${org.name}` }, content),
    text,
    subject: `You've been invited to join ${org.name}`,
  };
}

// ============================================
// ALERT NOTIFICATION EMAIL
// ============================================

export interface AlertEmailOptions {
  org: OrgBranding;
  alertTitle: string;
  alertMessage: string;
  severity: 'info' | 'warning' | 'critical';
  domainName?: string;
  alertUrl: string;
  timestamp: Date;
}

export function generateAlertEmail(options: AlertEmailOptions): { html: string; text: string; subject: string } {
  const { org, alertTitle, alertMessage, severity, domainName, alertUrl, timestamp } = options;
  const primaryColor = org.primaryColor || '#3B82F6';

  const severityConfig = {
    info: { color: '#3b82f6', bg: '#eff6ff', label: 'Info', icon: 'ℹ️' },
    warning: { color: '#f59e0b', bg: '#fffbeb', label: 'Warning', icon: '⚠️' },
    critical: { color: '#ef4444', bg: '#fef2f2', label: 'Critical', icon: '🚨' },
  }[severity];

  const timestampFormatted = timestamp.toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const content = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 16px;">
      <tr>
        <td>
          <span style="display: inline-block; padding: 4px 12px; background-color: ${severityConfig.bg}; color: ${severityConfig.color}; font-size: 12px; font-weight: 600; border-radius: 9999px; text-transform: uppercase;">
            ${severityConfig.icon} ${severityConfig.label}
          </span>
        </td>
      </tr>
    </table>

    <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #18181b;">
      ${alertTitle}
    </h1>

    ${domainName ? `
      <p style="margin: 0 0 16px; font-size: 14px; color: #71717a;">
        Domain: <strong>${domainName}</strong>
      </p>
    ` : ''}

    <p style="margin: 0 0 16px; font-size: 15px; color: #3f3f46; line-height: 1.6;">
      ${alertMessage}
    </p>

    <p style="margin: 0 0 16px; font-size: 12px; color: #a1a1aa;">
      Detected at ${timestampFormatted}
    </p>

    ${getButton('View Alert Details', alertUrl, primaryColor)}
  `;

  const text = `
[${severityConfig.label.toUpperCase()}] ${alertTitle}

${domainName ? `Domain: ${domainName}\n` : ''}
${alertMessage}

Detected at ${timestampFormatted}

View alert details:
${alertUrl}

---
Sent by ${org.name} via DMARC Analyser
  `.trim();

  const subjectPrefix = severity === 'critical' ? '[CRITICAL] ' : severity === 'warning' ? '[WARNING] ' : '';

  return {
    html: getBaseTemplate({ org, previewText: alertMessage.substring(0, 100) }, content),
    text,
    subject: `${subjectPrefix}${alertTitle} - ${org.name}`,
  };
}

// ============================================
// SCHEDULED REPORT EMAIL
// ============================================

export interface ReportEmailOptions {
  org: OrgBranding;
  reportName: string;
  periodStart: Date;
  periodEnd: Date;
  domainName?: string;
  summary: {
    totalMessages: number;
    passRate: number;
    failedMessages: number;
    newSources: number;
  };
  reportUrl: string;
}

export function generateReportEmail(options: ReportEmailOptions): { html: string; text: string; subject: string } {
  const { org, reportName, periodStart, periodEnd, domainName, summary, reportUrl } = options;
  const primaryColor = org.primaryColor || '#3B82F6';
  const accentColor = org.accentColor || '#10B981';

  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const periodFormatted = `${formatDate(periodStart)} - ${formatDate(periodEnd)}`;

  const passRateColor = summary.passRate >= 95 ? '#10b981' : summary.passRate >= 80 ? '#f59e0b' : '#ef4444';

  const content = `
    <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #18181b;">
      ${reportName}
    </h1>

    <p style="margin: 0 0 24px; font-size: 14px; color: #71717a;">
      ${periodFormatted}${domainName ? ` • ${domainName}` : ''}
    </p>

    <!-- Stats Grid -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
      <tr>
        <td width="50%" style="padding-right: 8px; padding-bottom: 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; border-radius: 8px; padding: 16px;">
            <tr>
              <td>
                <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Total Messages</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #18181b;">${summary.totalMessages.toLocaleString()}</p>
              </td>
            </tr>
          </table>
        </td>
        <td width="50%" style="padding-left: 8px; padding-bottom: 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; border-radius: 8px; padding: 16px;">
            <tr>
              <td>
                <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Pass Rate</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: ${passRateColor};">${summary.passRate.toFixed(1)}%</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td width="50%" style="padding-right: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; border-radius: 8px; padding: 16px;">
            <tr>
              <td>
                <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Failed Messages</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: ${summary.failedMessages > 0 ? '#ef4444' : '#18181b'};">${summary.failedMessages.toLocaleString()}</p>
              </td>
            </tr>
          </table>
        </td>
        <td width="50%" style="padding-left: 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; border-radius: 8px; padding: 16px;">
            <tr>
              <td>
                <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">New Sources</p>
                <p style="margin: 4px 0 0; font-size: 24px; font-weight: 700; color: #18181b;">${summary.newSources}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 8px; font-size: 14px; color: #52525b; line-height: 1.6;">
      View the full report for detailed breakdowns, source analysis, and recommendations.
    </p>

    ${getButton('View Full Report', reportUrl, primaryColor)}
  `;

  const text = `
${reportName}
${periodFormatted}${domainName ? ` • ${domainName}` : ''}

Summary:
- Total Messages: ${summary.totalMessages.toLocaleString()}
- Pass Rate: ${summary.passRate.toFixed(1)}%
- Failed Messages: ${summary.failedMessages.toLocaleString()}
- New Sources: ${summary.newSources}

View the full report:
${reportUrl}

---
Sent by ${org.name} via DMARC Analyser
  `.trim();

  return {
    html: getBaseTemplate({ org, previewText: `${summary.passRate.toFixed(1)}% pass rate with ${summary.totalMessages.toLocaleString()} messages` }, content),
    text,
    subject: `${reportName} - ${org.name}`,
  };
}

// ============================================
// TEST EMAIL (already exists, but branded version)
// ============================================

export interface TestEmailOptions {
  org: OrgBranding;
}

export function generateTestEmail(options: TestEmailOptions): { html: string; text: string; subject: string } {
  const { org } = options;
  const primaryColor = org.primaryColor || '#3B82F6';
  const accentColor = org.accentColor || '#10B981';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; width: 64px; height: 64px; background-color: ${accentColor}20; border-radius: 50%; line-height: 64px;">
        <span style="font-size: 32px;">✓</span>
      </div>
    </div>

    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b; text-align: center;">
      Email Sending Works!
    </h1>

    <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6; text-align: center;">
      This is a test email from <strong>${org.name}</strong>. If you're reading this, your Gmail sending configuration is working correctly.
    </p>

    ${getInfoBox(`
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>What this means:</strong>
      </p>
      <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #3b82f6;">
        <li>Gmail OAuth is properly configured</li>
        <li>The gmail.send permission is granted</li>
        <li>Alert notifications will be delivered</li>
        <li>Scheduled reports will work</li>
      </ul>
    `, '#eff6ff', primaryColor)}

    <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
      Sent at ${new Date().toISOString()}
    </p>
  `;

  const text = `
Email Sending Works!

This is a test email from ${org.name}. If you're reading this, your Gmail sending configuration is working correctly.

What this means:
- Gmail OAuth is properly configured
- The gmail.send permission is granted
- Alert notifications will be delivered
- Scheduled reports will work

Sent at ${new Date().toISOString()}

---
Sent by ${org.name} via DMARC Analyser
  `.trim();

  return {
    html: getBaseTemplate({ org, previewText: 'Your email sending is working correctly!' }, content),
    text,
    subject: `Test Email from ${org.name}`,
  };
}

// ============================================
// WELCOME EMAIL (after joining org)
// ============================================

export interface WelcomeEmailOptions {
  org: OrgBranding;
  userName: string;
  role: string;
  dashboardUrl: string;
}

export function generateWelcomeEmail(options: WelcomeEmailOptions): { html: string; text: string; subject: string } {
  const { org, userName, role, dashboardUrl } = options;
  const primaryColor = org.primaryColor || '#3B82F6';

  const roleDisplay = {
    owner: 'Owner',
    admin: 'Administrator',
    member: 'Member',
    viewer: 'Viewer',
  }[role] || role;

  const content = `
    <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #18181b;">
      Welcome to ${org.name}! 👋
    </h1>

    <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
      Hi ${userName || 'there'},
    </p>

    <p style="margin: 0 0 24px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
      You've successfully joined <strong>${org.name}</strong> as ${roleDisplay === 'Owner' || roleDisplay === 'Administrator' ? 'an' : 'a'} <strong>${roleDisplay}</strong>. You now have access to the organisation's DMARC monitoring dashboard.
    </p>

    ${getInfoBox(`
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        <strong>What you can do:</strong>
      </p>
      <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #3b82f6;">
        <li>View DMARC reports and analytics</li>
        <li>Monitor email authentication status</li>
        <li>Track sending sources</li>
        ${role === 'admin' || role === 'owner' ? '<li>Manage domains and team members</li>' : ''}
        ${role === 'owner' ? '<li>Configure organisation settings</li>' : ''}
      </ul>
    `, '#eff6ff', primaryColor)}

    ${getButton('Go to Dashboard', dashboardUrl, primaryColor)}
  `;

  const text = `
Welcome to ${org.name}!

Hi ${userName || 'there'},

You've successfully joined ${org.name} as ${roleDisplay === 'Owner' || roleDisplay === 'Administrator' ? 'an' : 'a'} ${roleDisplay}. You now have access to the organisation's DMARC monitoring dashboard.

What you can do:
- View DMARC reports and analytics
- Monitor email authentication status
- Track sending sources
${role === 'admin' || role === 'owner' ? '- Manage domains and team members\n' : ''}${role === 'owner' ? '- Configure organisation settings\n' : ''}

Go to your dashboard:
${dashboardUrl}

---
Sent by ${org.name} via DMARC Analyser
  `.trim();

  return {
    html: getBaseTemplate({ org, previewText: `Welcome to ${org.name}! You now have access to the DMARC dashboard.` }, content),
    text,
    subject: `Welcome to ${org.name}!`,
  };
}
