# Scheduled Reports - Quick Start Guide

## Overview

The Scheduled Reports feature is now fully implemented and ready for use. This guide will help you get started quickly.

## What's Been Implemented

### Complete Features
- Database schema with all required fields
- Full CRUD API endpoints
- React component for managing reports
- Settings page with user-friendly UI
- Test send functionality
- Multiple timezone support
- Flexible scheduling (daily, weekly, monthly)
- Content customization options
- Role-based access control

### What Needs Email Integration

The email sending functionality is stubbed out with TODO comments. You'll need to:
1. Choose an email service (Resend, SendGrid, AWS SES, etc.)
2. Implement the email templates
3. Add the email sending logic
4. Set up a cron job or scheduled task to send reports

## File Structure

```
src/
├── app/
│   ├── api/orgs/[slug]/scheduled-reports/
│   │   ├── route.ts                    # GET (list), POST (create)
│   │   └── [reportId]/
│   │       ├── route.ts                # GET, PATCH, DELETE
│   │       └── test/route.ts           # POST (test send)
│   └── (dashboard)/orgs/[slug]/settings/reports/
│       └── page.tsx                    # Settings UI page
├── components/reports/
│   └── scheduled-reports-manager.tsx   # Main React component
├── lib/
│   └── scheduled-reports.ts            # Helper utilities
└── db/
    └── schema.ts                       # Database schema

drizzle/
└── 0002_enhance_scheduled_reports.sql  # Migration file
```

## Quick Start

### 1. Run the Database Migration

```bash
# Apply migrations
npm run db:push

# Or if using migration files
npm run db:migrate
```

### 2. Access the Feature

Navigate to: `/orgs/[your-org-slug]/settings/reports`

The navigation link "Scheduled Reports" is already added to the sidebar under Settings.

### 3. Create a Report

1. Click "Add Report"
2. Fill in the form:
   - **Name:** e.g., "Weekly DMARC Summary"
   - **Domain:** Select a specific domain or leave empty for all domains
   - **Frequency:** Daily, Weekly, or Monthly
   - **Day/Time:** Choose when to send
   - **Timezone:** Select your timezone
   - **Recipients:** Enter email addresses (one per line or comma-separated)
   - **Content Options:** Choose what to include

3. Click "Create Report"

### 4. Test the Report

Click the "Test" button on any report to simulate sending. Check the server console logs to see the test data.

## API Endpoints

### List Reports
```bash
GET /api/orgs/[slug]/scheduled-reports
```

### Create Report
```bash
POST /api/orgs/[slug]/scheduled-reports
Content-Type: application/json

{
  "name": "Weekly Summary",
  "domainId": "uuid-or-null",
  "frequency": "weekly",
  "dayOfWeek": 1,
  "hour": 9,
  "timezone": "UTC",
  "recipients": "[\"test@example.com\"]",
  "includeCharts": true,
  "includeSources": true,
  "includeFailures": true
}
```

### Update Report
```bash
PATCH /api/orgs/[slug]/scheduled-reports/[reportId]
Content-Type: application/json

{
  "isActive": false
}
```

### Delete Report
```bash
DELETE /api/orgs/[slug]/scheduled-reports/[reportId]
```

### Test Send
```bash
POST /api/orgs/[slug]/scheduled-reports/[reportId]/test
```

## Next Steps for Production

### 1. Email Service Setup

Choose an email provider and add credentials:

**Resend (Recommended):**
```bash
npm install resend
```

Add to `.env`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
```

**SendGrid:**
```bash
npm install @sendgrid/mail
```

Add to `.env`:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
```

### 2. Implement Email Sending

Edit `/src/lib/scheduled-reports.ts` and implement:
- `sendReportEmail()` - Send emails via your chosen provider
- `formatReportEmail()` - Generate HTML email templates
- `generateReportData()` - Fetch and aggregate DMARC data

### 3. Create Email Templates

Design HTML email templates in `/src/templates/` (or similar):
- `report-email.html` - Main report template
- Include responsive design
- Add charts/graphs
- Style for dark mode support

### 4. Set Up Scheduled Job

Create a cron job or scheduled task to run every hour (or more frequently):

**Option A: Node-cron (if self-hosted)**
```typescript
// src/jobs/send-scheduled-reports.ts
import cron from 'node-cron';

cron.schedule('0 * * * *', async () => {
  // Query for reports where nextRunAt <= now() and isActive = true
  // For each report:
  //   - Generate report data
  //   - Send email
  //   - Update lastSentAt and nextRunAt
});
```

**Option B: GitHub Actions (if using GitHub)**
```yaml
# .github/workflows/scheduled-reports.yml
name: Send Scheduled Reports
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
  workflow_dispatch:

jobs:
  send-reports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Send Reports
        run: npx tsx src/jobs/send-scheduled-reports.ts
```

**Option C: Vercel Cron (if using Vercel)**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/send-reports",
    "schedule": "0 * * * *"
  }]
}
```

Then create `/src/app/api/cron/send-reports/route.ts`

### 5. Testing Checklist

- [ ] Create a report with valid data
- [ ] Edit an existing report
- [ ] Delete a report
- [ ] Toggle active/inactive status
- [ ] Test send functionality
- [ ] Verify email is received
- [ ] Check email rendering on mobile
- [ ] Test with multiple recipients
- [ ] Verify timezone handling
- [ ] Test daily schedule
- [ ] Test weekly schedule
- [ ] Test monthly schedule
- [ ] Verify nextRunAt calculation
- [ ] Test with specific domain filter
- [ ] Test with all domains

## Common Issues

### Recipients Not Parsing
Make sure recipients are stored as JSON string:
```typescript
recipients: JSON.stringify(['email@example.com'])
```

### Timezone Issues
The current implementation uses simple UTC calculations. For production, use `date-fns-tz` or `luxon` for proper timezone support.

### Email Not Sending
Check:
1. Email service credentials are correct
2. Email sending function is properly implemented
3. Recipients array is valid JSON
4. No rate limiting on email provider

### Scheduled Job Not Running
Verify:
1. Cron syntax is correct
2. Job runner is actually running
3. Database connection works in job context
4. Proper error logging is in place

## Support

- See `SCHEDULED_REPORTS_IMPLEMENTATION.md` for detailed architecture
- Check API route files for backend logic
- Review component file for UI behavior
- Check helper utilities in `/src/lib/scheduled-reports.ts`

## License

This feature follows the same license as the parent project.
