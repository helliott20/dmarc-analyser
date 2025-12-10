# Forensic Reports (RUF) Implementation

This document describes the implementation of the Forensic Reports (RUF) feature for the DMARC Analyser application.

## Overview

Forensic reports (RUF - Report URI Forensic) are individual failure reports sent by email providers when an email fails DMARC authentication. Unlike aggregate reports (RUA) which provide statistical data, forensic reports contain detailed information about individual failed messages.

## Features Implemented

### 1. Database Schema Enhancements

**Location:** `/src/db/schema.ts`

#### New Enum
- `feedbackTypeEnum`: Defines possible feedback types ('auth-failure', 'fraud', 'abuse', 'not-spam', 'virus', 'other')

#### Enhanced `forensicReports` Table
- `reportId`: Unique identifier from the report
- `feedbackType`: Type of failure (uses enum)
- `reporterOrgName`: Name of the reporting organization
- `arrivalDate`: When the message was received
- `sourceIp`: Source IP address of the failed message
- `originalMailFrom`: Envelope sender address
- `originalRcptTo`: Recipient address
- `subject`: Email subject (nullable, may contain PII)
- `messageId`: Message-ID header (nullable)
- `authResults`: JSON object containing detailed authentication results
- `dkimResult`, `dkimDomain`: DKIM authentication details
- `spfResult`, `spfDomain`: SPF authentication details
- `deliveryResult`: Delivery outcome
- `rawReport`: Full raw report data
- `createdAt`, `updatedAt`: Timestamps

#### Indexes
- `forensic_reports_domain_idx`: For domain lookups
- `forensic_reports_arrival_idx`: For date-based queries
- `forensic_reports_source_ip_idx`: For IP-based filtering
- `forensic_reports_feedback_type_idx`: For type-based filtering

### 2. API Routes

#### GET `/api/orgs/[slug]/domains/[domainId]/forensic`

**Location:** `/src/app/api/orgs/[slug]/domains/[domainId]/forensic/route.ts`

Lists forensic reports with pagination and filtering.

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 50): Items per page
- `feedbackType` (string): Filter by feedback type ('auth-failure', 'fraud', etc.)
- `startDate` (ISO date): Filter reports after this date
- `endDate` (ISO date): Filter reports before this date

**Response:**
```typescript
{
  reports: ForensicReport[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  stats: {
    [feedbackType: string]: number
  }
}
```

#### GET `/api/orgs/[slug]/domains/[domainId]/forensic/[reportId]`

**Location:** `/src/app/api/orgs/[slug]/domains/[domainId]/forensic/[reportId]/route.ts`

Retrieves full details of a single forensic report.

**Response:** Complete forensic report object including raw report data.

### 3. UI Components

#### ForensicReportsTable
**Location:** `/src/components/forensic/forensic-reports-table.tsx`

Interactive table displaying forensic reports with:
- Expandable rows for quick details
- Click-through to full detail modal
- Color-coded authentication results
- Feedback type badges
- Sortable columns

**Features:**
- Inline expansion for quick info
- Dialog modal for detailed view
- Loading states
- Empty state handling

#### ForensicReportDetail
**Location:** `/src/components/forensic/forensic-report-detail.tsx`

Detailed view component showing:
- Report metadata (type, reporter, date)
- Source information (IP, mail from/to)
- Message details (subject, message ID)
- Authentication results (SPF, DKIM)
- Collapsible raw report data
- Collapsible detailed auth results

**Features:**
- Organized card layout
- Color-coded result badges
- Collapsible sections for technical data
- PII warning considerations

### 4. Page

#### Forensic Reports Page
**Location:** `/src/app/(dashboard)/orgs/[slug]/domains/[domainId]/forensic/page.tsx`

Main page for viewing forensic reports.

**Sections:**
1. **Header**: Navigation back to domain, title
2. **Summary Stats Cards**:
   - Total Reports
   - Auth Failures count
   - SPF Failures count
   - DKIM Failures count
3. **Breakdown by Type**: Distribution of feedback types
4. **Reports Table**: Paginated, filterable table

**Features:**
- Server-side rendered with initial data
- Summary statistics
- Empty state with helpful information
- Responsive design

### 5. Navigation

The Forensic Reports link is already integrated in the sidebar navigation:
- **Location:** `/src/components/dashboard/app-sidebar.tsx` (lines 241-253)
- **Icon:** Shield icon
- **Path:** `/orgs/[slug]/domains/[domainId]/forensic`

## Database Migration

A migration SQL file has been created to document the required changes:

**Location:** `/drizzle/migrations/add_forensic_reports_enhancements.sql`

To apply the migration:
1. Review the SQL file
2. Run using Drizzle ORM: `npm run db:push` or `npm run db:migrate`
3. Verify the schema changes in your database

## Usage

### Accessing Forensic Reports

1. Navigate to a domain: `/orgs/[slug]/domains/[domainId]`
2. Click "Forensic" in the sidebar
3. View the summary statistics
4. Browse reports in the table
5. Click the expand icon for quick details
6. Click the external link icon for full details in a modal

### Understanding Feedback Types

- **auth-failure**: DMARC authentication failed
- **fraud**: Suspected phishing or fraud
- **abuse**: Abusive content
- **virus**: Malware detected
- **not-spam**: False positive
- **other**: Other types of feedback

### Authentication Results

Each report shows:
- **SPF**: Pass/Fail status with domain
- **DKIM**: Pass/Fail status with domain and selector
- **Combined**: Overall authentication status

## Important Notes

### Privacy Considerations

Forensic reports may contain Personally Identifiable Information (PII):
- Email subjects
- Message IDs
- Email addresses
- Message content (in raw report)

**Recommendations:**
1. Implement appropriate access controls
2. Consider data retention policies
3. Redact sensitive information if needed
4. Comply with privacy regulations (GDPR, etc.)

### Availability

Not all email providers send forensic reports:
- They must be explicitly requested in the DMARC record (`ruf=` tag)
- Many providers don't send them due to privacy concerns
- Volume is typically much lower than aggregate reports

## Testing

To test the feature:

1. **Database Setup**: Ensure the migrations are applied
2. **Sample Data**: Insert test forensic reports (optional)
3. **Navigation**: Verify the sidebar link works
4. **API Endpoints**: Test using browser DevTools or API client
5. **UI Components**: Test table expansion, modal, filtering

## Future Enhancements

Potential improvements:
- Advanced filtering (by IP range, date range picker)
- Export functionality
- Bulk actions
- Alert rules based on forensic reports
- Integration with threat intelligence
- Automatic IP classification
- Rate limiting display

## Files Created/Modified

### Created
1. `/src/app/api/orgs/[slug]/domains/[domainId]/forensic/route.ts`
2. `/src/app/api/orgs/[slug]/domains/[domainId]/forensic/[reportId]/route.ts`
3. `/src/app/(dashboard)/orgs/[slug]/domains/[domainId]/forensic/page.tsx`
4. `/src/components/forensic/forensic-reports-table.tsx`
5. `/src/components/forensic/forensic-report-detail.tsx`
6. `/drizzle/migrations/add_forensic_reports_enhancements.sql`
7. `/FORENSIC_REPORTS_IMPLEMENTATION.md` (this file)

### Modified
1. `/src/db/schema.ts`
   - Added `feedbackTypeEnum`
   - Enhanced `forensicReports` table
   - Added `forensicReportsRelations`
   - Added indexes for better query performance

### Navigation (Already Present)
- `/src/components/dashboard/app-sidebar.tsx` - Forensic link already exists

## Dependencies

The implementation uses existing dependencies:
- Next.js 15 App Router
- Drizzle ORM
- shadcn/ui components
- Radix UI primitives
- Lucide icons

No new dependencies were added.
