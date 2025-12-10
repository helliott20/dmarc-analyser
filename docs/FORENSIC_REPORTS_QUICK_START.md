# Forensic Reports - Quick Start Guide

## What's Been Implemented

A complete Forensic Reports (RUF) feature has been added to the DMARC Analyser application. This allows you to view and analyze individual DMARC failure reports with detailed authentication information.

## Getting Started

### 1. Apply Database Migrations

Before using the feature, apply the database schema changes:

```bash
# Generate migration (if using Drizzle Kit)
npm run db:generate

# Apply migration
npm run db:push
# OR
npm run db:migrate
```

Alternatively, you can manually run the SQL migration:
```bash
psql -U your_user -d your_database -f drizzle/migrations/add_forensic_reports_enhancements.sql
```

### 2. Access the Feature

1. Navigate to any domain in your organization
2. Look for "Forensic" in the sidebar navigation (between Timeline and Subdomains)
3. Click to view the forensic reports page

**URL Pattern:** `/orgs/[slug]/domains/[domainId]/forensic`

## Feature Overview

### Summary Statistics

At the top of the page, you'll see:
- **Total Reports**: All forensic reports received
- **Auth Failures**: Reports marked as authentication failures
- **SPF Failures**: Count of SPF check failures
- **DKIM Failures**: Count of DKIM check failures

### Reports Table

The main table displays:
- **Date**: When the message arrived
- **Type**: Feedback type (auth-failure, fraud, etc.)
- **Source IP**: Where the message came from
- **From/To**: Email addresses
- **Subject**: Email subject line (if available)
- **SPF/DKIM**: Visual indicators for authentication results

### Interacting with Reports

**Expand for Quick Details:**
- Click the chevron icon on the left to expand a row
- See message ID, reporter, and domain information inline

**View Full Details:**
- Click the external link icon on the right
- Opens a modal with complete report information
- Includes collapsible sections for:
  - Raw report data
  - Detailed authentication results (JSON)

## API Endpoints

### List Reports
```
GET /api/orgs/[slug]/domains/[domainId]/forensic
```

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `feedbackType`: Filter by type (auth-failure, fraud, abuse, etc.)
- `startDate`: ISO date string
- `endDate`: ISO date string

### Get Single Report
```
GET /api/orgs/[slug]/domains/[domainId]/forensic/[reportId]
```

Returns complete report details including raw data.

## Understanding the Data

### Feedback Types

- **auth-failure**: DMARC authentication failed (most common)
- **fraud**: Suspected phishing or fraudulent content
- **abuse**: Abusive or harmful content
- **virus**: Malware detected in the message
- **not-spam**: False positive - message was legitimate
- **other**: Other types of feedback

### Authentication Results

- **Pass (green check)**: Authentication succeeded
- **Fail (red X)**: Authentication failed
- **Other statuses**: Various failure modes (softfail, temperror, etc.)

## Important Notes

### Privacy Considerations

Forensic reports contain sensitive information:
- Email subjects may reveal business operations
- Email addresses are personal data
- Raw reports may contain message content

**Best Practices:**
- Limit access to trusted team members
- Consider GDPR and privacy regulations
- Implement data retention policies
- Redact sensitive information if sharing

### Availability

Forensic reports are **not always available**:
- Must be requested in DMARC record (`ruf=` tag)
- Many providers don't send them due to privacy concerns
- Gmail, for example, rarely sends forensic reports
- Volume is typically much lower than aggregate reports

If you see "No forensic reports yet":
- This is normal and expected
- Check your DMARC record has the `ruf=` tag
- Not all providers support forensic reporting
- Consider using aggregate reports (RUA) instead

## Testing with Sample Data

To test the feature without real data, you can insert sample records:

```sql
INSERT INTO forensic_reports (
  domain_id,
  feedback_type,
  reporter_org_name,
  arrival_date,
  source_ip,
  original_mail_from,
  original_rcpt_to,
  subject,
  spf_result,
  dkim_result,
  auth_results
) VALUES (
  'your-domain-id',
  'auth-failure',
  'example.com',
  NOW(),
  '192.0.2.1',
  'sender@example.com',
  'recipient@yourdomain.com',
  'Test Forensic Report',
  'fail',
  'fail',
  '{"dkim": {"result": "fail"}, "spf": {"result": "fail"}}'::jsonb
);
```

## Troubleshooting

### Page Not Loading
- Verify database migrations are applied
- Check console for errors
- Ensure user has access to the organization

### No Reports Showing
- This is normal if no forensic reports have been received
- Check if domain has `ruf=` in DMARC record
- Verify Gmail sync or other import methods are configured

### API Errors
- Check server logs
- Verify domain ID is correct
- Ensure user has proper permissions

## Next Steps

1. **Configure DMARC**: Ensure your DMARC record includes the `ruf=` tag
2. **Set Up Alerts**: Create alert rules for forensic report patterns
3. **Monitor Trends**: Look for patterns in authentication failures
4. **Investigate Failures**: Use detailed reports to diagnose issues

## Files Reference

- **Page**: `/src/app/(dashboard)/orgs/[slug]/domains/[domainId]/forensic/page.tsx`
- **API**: `/src/app/api/orgs/[slug]/domains/[domainId]/forensic/route.ts`
- **Components**: `/src/components/forensic/`
- **Schema**: `/src/db/schema.ts` (forensicReports table)

## Full Documentation

For complete implementation details, see:
- `FORENSIC_REPORTS_IMPLEMENTATION.md`
