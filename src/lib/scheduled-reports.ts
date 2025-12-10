/**
 * Utilities for working with scheduled reports
 */

export interface ScheduledReportConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 (0 = Sunday)
  dayOfMonth?: number; // 1-31
  hour: number; // 0-23
  timezone: string;
}

/**
 * Calculate the next run time for a scheduled report
 * TODO: Implement proper timezone-aware scheduling using a library like date-fns-tz
 */
export function calculateNextRunAt(config: ScheduledReportConfig): Date {
  const { frequency, dayOfWeek, dayOfMonth, hour, timezone } = config;

  // For now, using simple UTC-based calculation
  // In production, you should use a proper timezone library
  const now = new Date();
  const nextRun = new Date();

  nextRun.setHours(hour, 0, 0, 0);

  if (frequency === 'daily') {
    // If today's hour has passed, schedule for tomorrow
    if (now.getHours() >= hour) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'weekly' && dayOfWeek !== undefined) {
    // Calculate days until next occurrence
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;

    if (daysUntil < 0 || (daysUntil === 0 && now.getHours() >= hour)) {
      daysUntil += 7;
    }

    nextRun.setDate(nextRun.getDate() + daysUntil);
  } else if (frequency === 'monthly' && dayOfMonth !== undefined) {
    // Set to the specified day of month
    nextRun.setDate(dayOfMonth);

    // If it's already passed this month, move to next month
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }

    // Handle months with fewer days
    while (nextRun.getDate() !== dayOfMonth) {
      nextRun.setMonth(nextRun.getMonth() + 1);
      nextRun.setDate(dayOfMonth);
    }
  }

  return nextRun;
}

/**
 * Get a human-readable description of the schedule
 */
export function getScheduleDescription(config: ScheduledReportConfig): string {
  const { frequency, dayOfWeek, dayOfMonth, hour, timezone } = config;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const timeStr = `${displayHour}:00 ${ampm} ${timezone}`;

  if (frequency === 'daily') {
    return `Daily at ${timeStr}`;
  } else if (frequency === 'weekly' && dayOfWeek !== undefined) {
    return `Weekly on ${days[dayOfWeek]} at ${timeStr}`;
  } else if (frequency === 'monthly' && dayOfMonth !== undefined) {
    const suffix =
      dayOfMonth === 1 ? 'st' :
      dayOfMonth === 2 ? 'nd' :
      dayOfMonth === 3 ? 'rd' : 'th';
    return `Monthly on the ${dayOfMonth}${suffix} at ${timeStr}`;
  }

  return 'Unknown schedule';
}

/**
 * Validate recipients array
 */
export function validateRecipients(recipients: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(recipients)) {
    return { valid: false, errors: ['Recipients must be an array'] };
  }

  if (recipients.length === 0) {
    return { valid: false, errors: ['At least one recipient is required'] };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = recipients.filter(email => !emailRegex.test(email));

  if (invalidEmails.length > 0) {
    errors.push(`Invalid email addresses: ${invalidEmails.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse recipients from text input (supports comma or newline separated)
 */
export function parseRecipientsInput(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map(email => email.trim())
    .filter(email => email.length > 0);
}

/**
 * Generate report data for a given period
 * TODO: Implement this function to fetch and aggregate DMARC data
 */
export async function generateReportData(
  organizationId: string,
  domainId: string | null,
  frequency: 'daily' | 'weekly' | 'monthly'
): Promise<any> {
  // This would fetch DMARC data from the database
  // and aggregate it based on the frequency period

  // Placeholder for now
  return {
    period: frequency,
    domainId,
    // Add actual data here
  };
}

/**
 * Format report content for email
 * TODO: Implement this function to generate HTML email content
 */
export function formatReportEmail(
  reportData: any,
  options: {
    includeCharts: boolean;
    includeSources: boolean;
    includeFailures: boolean;
  }
): string {
  // This would generate the HTML email content
  // including charts, tables, and formatted data

  // Placeholder for now
  return `
    <html>
      <body>
        <h1>DMARC Report</h1>
        <p>Report content would go here...</p>
      </body>
    </html>
  `;
}

/**
 * Send scheduled report email
 * TODO: Implement this function to actually send emails
 */
export async function sendReportEmail(
  recipients: string[],
  subject: string,
  htmlContent: string
): Promise<void> {
  // This would use an email service (e.g., SendGrid, AWS SES, Resend)
  // to send the email to all recipients

  console.log('Sending report email:', {
    recipients,
    subject,
    contentLength: htmlContent.length,
  });

  // TODO: Replace with actual email sending logic
  // Example with Resend:
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'reports@yourdomain.com',
  //   to: recipients,
  //   subject,
  //   html: htmlContent,
  // });
}
