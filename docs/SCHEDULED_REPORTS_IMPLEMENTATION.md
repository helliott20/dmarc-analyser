# Scheduled Reports / Email Digest Feature

Complete implementation of scheduled email reports for DMARC analyzer data.

## Overview

This feature allows users to configure automated email digests of their DMARC data. Reports can be scheduled to run daily, weekly, or monthly, with customizable content and multiple recipients.

## Files Created/Modified

### Database Schema

**Modified:**
- `/src/db/schema.ts` - Enhanced `scheduledReports` table with additional fields

**Migration:**
- `/drizzle/0002_enhance_scheduled_reports.sql` - Database migration for new fields

### API Routes

Created:
- `/src/app/api/orgs/[slug]/scheduled-reports/route.ts`
  - GET: List all scheduled reports for an organization
  - POST: Create a new scheduled report

- `/src/app/api/orgs/[slug]/scheduled-reports/[reportId]/route.ts`
  - GET: Get a specific scheduled report
  - PATCH: Update a scheduled report
  - DELETE: Delete a scheduled report

- `/src/app/api/orgs/[slug]/scheduled-reports/[reportId]/test/route.ts`
  - POST: Send a test email for a scheduled report

### UI Components

Created:
- `/src/components/reports/scheduled-reports-manager.tsx` - Main UI component for managing scheduled reports

### Pages

Created:
- `/src/app/(dashboard)/orgs/[slug]/settings/reports/page.tsx` - Settings page for scheduled reports

### Utilities

Created:
- `/src/lib/scheduled-reports.ts` - Helper functions for working with scheduled reports

## Database Schema

The `scheduled_reports` table includes:

```typescript
{
  id: uuid (primary key)
  organizationId: uuid (foreign key)
  domainId: uuid (nullable) // null = all domains

  name: string
  frequency: 'daily' | 'weekly' | 'monthly'
  dayOfWeek: number (0-6, for weekly)
  dayOfMonth: number (1-31, for monthly)
  hour: number (0-23)
  timezone: string

  recipients: text (JSON array of emails)
  includeCharts: boolean
  includeSources: boolean
  includeFailures: boolean

  lastSentAt: timestamp
  nextRunAt: timestamp
  isActive: boolean

  createdBy: uuid
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Features Implemented

### 1. Report Configuration
- Name and description
- Domain selection (specific domain or all domains)
- Frequency selection (daily, weekly, monthly)
- Day selection (for weekly/monthly)
- Time and timezone selection
- Multiple recipients
- Content customization (charts, sources, failures)

### 2. Report Management
- Create new scheduled reports
- Edit existing reports
- Delete reports
- Enable/disable reports
- Test send functionality

### 3. API Endpoints
- Full CRUD operations
- Authorization checks (owner, admin, member roles)
- Organization-level access control
- Test email sending

### 4. UI Components
- Responsive design using shadcn/ui
- Form validation
- Real-time updates
- Loading states
- Error handling with toast notifications

## Access Control

- **Viewing reports:** All organization members
- **Creating/editing reports:** Owner, Admin, Member roles
- **Deleting reports:** Owner, Admin, Member roles

## Next Steps (TODO)

### Required for Production

1. **Email Sending Implementation**
   - Choose an email service provider (Resend, SendGrid, AWS SES, etc.)
   - Implement email template generation
   - Add email sending logic in `/src/app/api/orgs/[slug]/scheduled-reports/[reportId]/test/route.ts`
   - Implement the functions in `/src/lib/scheduled-reports.ts`:
     - `generateReportData()`
     - `formatReportEmail()`
     - `sendReportEmail()`

2. **Scheduled Job Runner**
   - Set up a cron job or scheduled task to check for reports that need to be sent
   - Query `scheduled_reports` where `isActive = true` and `nextRunAt <= now()`
   - Generate and send reports
   - Update `lastSentAt` and calculate new `nextRunAt`

   Options:
   - Node-cron (if running on a single server)
   - GitHub Actions scheduled workflows
   - Vercel Cron (if using Vercel)
   - AWS EventBridge (if using AWS)
   - External service like Inngest, Trigger.dev, etc.

3. **Report Data Aggregation**
   - Implement DMARC data fetching for the report period
   - Calculate pass rates, failure counts, top sources
   - Generate charts and visualizations
   - Format data for email templates

4. **Email Templates**
   - Design HTML email templates
   - Include responsive design for mobile
   - Add charts/graphs (using Chart.js, or pre-rendered images)
   - Add summary statistics
   - Add call-to-action links back to the dashboard

5. **Timezone Handling**
   - Use a proper timezone library (e.g., `date-fns-tz` or `luxon`)
   - Update `calculateNextRunAt()` function
   - Test across different timezones

### Optional Enhancements

1. **Report History**
   - Store sent reports in a separate table
   - Allow users to view previously sent reports
   - Track open rates and click-through rates

2. **Advanced Scheduling**
   - Multiple days of week for weekly reports
   - Business days only option
   - Custom recurring schedules

3. **Report Templates**
   - Pre-configured report templates
   - Custom report layouts
   - Branding customization

4. **Delivery Options**
   - PDF attachment option
   - Slack/Teams integration
   - Webhook delivery

5. **Analytics**
   - Track report views
   - Monitor email delivery success
   - Add retry logic for failed sends

## Testing

### Manual Testing Steps

1. **Create a report:**
   ```
   - Navigate to /orgs/[slug]/settings/reports
   - Click "Add Report"
   - Fill in the form with test data
   - Click "Create Report"
   ```

2. **Test send:**
   ```
   - Click the "Test" button on a report
   - Check console logs for the test data
   - Verify no errors occur
   ```

3. **Edit a report:**
   ```
   - Click "Edit" on an existing report
   - Modify fields
   - Save changes
   - Verify updates are reflected
   ```

4. **Delete a report:**
   ```
   - Click the delete icon
   - Confirm deletion
   - Verify report is removed
   ```

### API Testing

```bash
# Get all scheduled reports
curl -X GET http://localhost:3000/api/orgs/[slug]/scheduled-reports

# Create a new report
curl -X POST http://localhost:3000/api/orgs/[slug]/scheduled-reports \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Summary",
    "frequency": "weekly",
    "dayOfWeek": 1,
    "hour": 9,
    "timezone": "UTC",
    "recipients": "[\"test@example.com\"]",
    "includeCharts": true,
    "includeSources": true,
    "includeFailures": true
  }'

# Test send
curl -X POST http://localhost:3000/api/orgs/[slug]/scheduled-reports/[id]/test

# Update a report
curl -X PATCH http://localhost:3000/api/orgs/[slug]/scheduled-reports/[id] \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# Delete a report
curl -X DELETE http://localhost:3000/api/orgs/[slug]/scheduled-reports/[id]
```

## Database Migration

Run the migration to update your database:

```bash
# Apply the migration
npm run db:push

# Or if using migrations
npm run db:migrate
```

## Environment Variables

No new environment variables are required for the basic implementation. However, when implementing email sending, you'll need:

```env
# Example for Resend
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Example for SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Example for AWS SES
AWS_ACCESS_KEY_ID=xxxxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxx
AWS_REGION=us-east-1
```

## Architecture Notes

### Scheduling Logic

The `calculateNextRunAt()` function determines when a report should next run:
- **Daily:** Next day at the specified hour
- **Weekly:** Next occurrence of the specified day of week
- **Monthly:** Next occurrence of the specified day of month

This calculation should be updated when:
- A report is created
- A report's schedule is modified
- A report is sent (calculate next occurrence)

### Data Flow

1. User creates scheduled report via UI
2. API validates input and calculates `nextRunAt`
3. Report is stored in database
4. Background job queries for reports where `nextRunAt <= now()` and `isActive = true`
5. For each report:
   - Fetch DMARC data for the period
   - Generate report content
   - Send email to all recipients
   - Update `lastSentAt` and calculate new `nextRunAt`

### Error Handling

- Validation errors return 400 with descriptive messages
- Authorization errors return 401/403
- Not found errors return 404
- Server errors return 500 and log details
- Email sending failures should be logged and potentially retried

## Support

For questions or issues with this implementation, refer to:
- API route files for backend logic
- Component file for UI behavior
- Helper utilities for shared functions
- This documentation for overall architecture

## License

This implementation follows the same license as the parent project.
