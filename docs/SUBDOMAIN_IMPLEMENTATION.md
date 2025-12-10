# Subdomain Management Implementation

This document describes the complete implementation of subdomain management for the DMARC analyzer.

## Overview

The subdomain management feature allows users to:
- Automatically discover subdomains from DMARC reports
- Track statistics (messages, pass/fail counts) for each subdomain
- Set policy overrides per subdomain
- View subdomain health and pass rates
- Identify subdomains with low authentication pass rates

## Changes Made

### 1. Database Schema Updates

**File:** `/home/mbox/dmarc-analyser/src/db/schema.ts`

Updated the `subdomains` table to include:
- `passCount`: bigint - Count of messages that passed DMARC authentication
- `failCount`: bigint - Count of messages that failed DMARC authentication
- `updatedAt`: timestamp - Last update timestamp

Added `subdomainsRelations` to define the relationship between subdomains and domains.

**Migration File:** `/home/mbox/dmarc-analyser/drizzle/0001_add_subdomain_stats.sql`

Run this migration to update the database:
```bash
npm run db:migrate
# or manually apply:
psql $DATABASE_URL < drizzle/0001_add_subdomain_stats.sql
```

### 2. Report Importer Enhancement

**File:** `/home/mbox/dmarc-analyser/src/lib/report-importer.ts`

Added automatic subdomain tracking:
- `extractSubdomain()` function checks if `header_from` is a subdomain of the tracked domain
- When importing records, automatically upserts subdomain statistics
- Tracks message counts, pass counts, and fail counts
- Uses `onConflictDoUpdate` to handle concurrent imports safely

**Logic:**
- If `header_from` ends with `.domain` (and is not the exact domain), it's treated as a subdomain
- Pass/fail status is determined by DMARC DKIM or SPF results
- First seen and last seen timestamps are updated automatically

### 3. API Endpoints

#### GET `/api/orgs/[slug]/domains/[domainId]/subdomains`

**File:** `/home/mbox/dmarc-analyser/src/app/api/orgs/[slug]/domains/[domainId]/subdomains/route.ts`

**Purpose:** List all subdomains for a domain with statistics

**Response:**
```json
[
  {
    "id": "uuid",
    "subdomain": "mail.example.com",
    "policyOverride": "quarantine",
    "firstSeen": "2024-01-01T00:00:00Z",
    "lastSeen": "2024-12-10T00:00:00Z",
    "messageCount": 1000,
    "passCount": 950,
    "failCount": 50,
    "passRate": 95.0,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-12-10T00:00:00Z"
  }
]
```

**Features:**
- Calculates pass rate for each subdomain
- Orders by message count (most active first)
- Requires authentication and organization membership

#### PATCH `/api/orgs/[slug]/domains/[domainId]/subdomains/[id]`

**File:** `/home/mbox/dmarc-analyser/src/app/api/orgs/[slug]/domains/[domainId]/subdomains/[id]/route.ts`

**Purpose:** Update subdomain policy override

**Request Body:**
```json
{
  "policyOverride": "quarantine" | "reject" | "none" | null
}
```

**Features:**
- Validates policy values
- Requires owner, admin, or member role
- Updates `updatedAt` timestamp automatically

### 4. Subdomains Page

**File:** `/home/mbox/dmarc-analyser/src/app/(dashboard)/orgs/[slug]/domains/[domainId]/subdomains/page.tsx`

**URL:** `/orgs/[slug]/domains/[domainId]/subdomains`

**Features:**
- Summary cards showing:
  - Total subdomain count
  - Number of subdomains with low pass rate (<80%)
- Comprehensive table with:
  - Subdomain name
  - Message counts (total, pass, fail)
  - Pass rate with color-coded badges
  - Policy override selector (for users with edit permissions)
  - First seen and last seen dates
- Responsive design with mobile support
- Empty state when no subdomains discovered

**Pass Rate Badge Colors:**
- Green (≥95%): Good authentication
- Yellow (80-94%): Warning - needs attention
- Red (<80%): Critical - action required

### 5. Subdomain Policy Selector Component

**File:** `/home/mbox/dmarc-analyser/src/components/subdomains/subdomain-policy-selector.tsx`

**Purpose:** Interactive dropdown to set policy overrides

**Features:**
- Dropdown with options: Default, None, Quarantine, Reject
- Real-time API updates with optimistic UI
- Toast notifications for success/failure
- Disabled state during updates
- Automatic page refresh after update

### 6. Sidebar Navigation

**File:** `/home/mbox/dmarc-analyser/src/components/dashboard/app-sidebar.tsx`

**Changes:**
- Added "Subdomains" link to domain sub-navigation
- Icon: Network (branching diagram)
- Positioned after "Forensic" in the menu
- Active state highlighting when on subdomains page

### 7. Domain Overview Integration

**File:** `/home/mbox/dmarc-analyser/src/app/(dashboard)/orgs/[slug]/domains/[domainId]/page.tsx`

**Changes:**
- Added `getSubdomainStats()` function to calculate:
  - Total subdomain count
  - Count of subdomains with low pass rate
- New "Subdomains" card on domain overview page (shown only when subdomains exist)
- Displays:
  - Total subdomain count with Network icon
  - Warning indicator for low pass rate subdomains
  - "View All" button linking to subdomains page

## Usage

### Automatic Discovery

Subdomains are automatically discovered during DMARC report import:
1. User imports DMARC reports (via Gmail sync or manual upload)
2. Report importer checks each record's `header_from` field
3. If it's a subdomain of the tracked domain, it's tracked in the database
4. Statistics are accumulated across all reports

### Viewing Subdomains

1. Navigate to a domain page
2. See subdomain summary on overview (if subdomains exist)
3. Click "View All" or use sidebar "Subdomains" link
4. View complete list with statistics

### Setting Policy Overrides

1. Go to subdomains page for a domain
2. Find subdomain in the table
3. Use "Policy Override" dropdown to select:
   - **Default**: Inherit from parent domain policy
   - **None**: No policy (monitoring only)
   - **Quarantine**: Mark as spam
   - **Reject**: Reject messages
4. Changes save automatically

## Technical Details

### Subdomain Detection

The `extractSubdomain()` function uses string matching:
```typescript
function extractSubdomain(headerFrom: string | undefined | null, domain: string): string | null {
  if (!headerFrom) return null;

  const headerFromLower = headerFrom.toLowerCase().trim();
  const domainLower = domain.toLowerCase().trim();

  // Check if headerFrom ends with .domain (subdomain)
  if (headerFromLower.endsWith('.' + domainLower) && headerFromLower !== domainLower) {
    return headerFromLower;
  }

  return null;
}
```

### Concurrent Updates

The implementation uses PostgreSQL's `ON CONFLICT DO UPDATE` to safely handle concurrent report imports:
- Multiple reports can be processed in parallel
- Statistics are accumulated atomically
- No race conditions or data loss

### Performance

- Subdomain table uses unique index on `(domainId, subdomain)`
- Statistics are pre-aggregated during import (no expensive queries)
- Pass rates calculated in application layer for flexibility

## Future Enhancements

Potential improvements for future iterations:

1. **Subdomain Insights**
   - Historical trends for subdomain pass rates
   - Anomaly detection (sudden drop in pass rate)
   - Comparison with parent domain

2. **Bulk Operations**
   - Set policy for multiple subdomains at once
   - Export subdomain list
   - Subdomain grouping/tagging

3. **Advanced Filtering**
   - Filter by pass rate threshold
   - Search by subdomain name
   - Sort by different columns

4. **Alerts**
   - Alert when new subdomain discovered
   - Alert when subdomain pass rate drops
   - Weekly subdomain health digest

5. **Policy Recommendations**
   - AI-suggested policy overrides based on patterns
   - Similar subdomain analysis
   - Recommended actions for low pass rate subdomains

## Testing

To test the implementation:

1. **Database Migration**
   ```bash
   npm run db:migrate
   ```

2. **Import DMARC Reports**
   - Use Gmail sync or manual upload
   - Ensure reports contain subdomain data in `header_from` field

3. **Verify Subdomain Detection**
   - Check domain overview page for subdomain card
   - Navigate to subdomains page
   - Verify statistics match imported reports

4. **Test Policy Overrides**
   - Set policy for a subdomain
   - Verify API response and database update
   - Check that changes persist after page refresh

## Files Modified/Created

### Modified
- `/home/mbox/dmarc-analyser/src/db/schema.ts`
- `/home/mbox/dmarc-analyser/src/lib/report-importer.ts`
- `/home/mbox/dmarc-analyser/src/components/dashboard/app-sidebar.tsx`
- `/home/mbox/dmarc-analyser/src/app/(dashboard)/orgs/[slug]/domains/[domainId]/page.tsx`

### Created
- `/home/mbox/dmarc-analyser/drizzle/0001_add_subdomain_stats.sql`
- `/home/mbox/dmarc-analyser/src/app/api/orgs/[slug]/domains/[domainId]/subdomains/route.ts`
- `/home/mbox/dmarc-analyser/src/app/api/orgs/[slug]/domains/[domainId]/subdomains/[id]/route.ts`
- `/home/mbox/dmarc-analyser/src/app/(dashboard)/orgs/[slug]/domains/[domainId]/subdomains/page.tsx`
- `/home/mbox/dmarc-analyser/src/components/subdomains/subdomain-policy-selector.tsx`

## Conclusion

The subdomain management feature is fully implemented and ready for use. It provides comprehensive tracking and management of subdomains discovered through DMARC reports, helping organizations maintain better email authentication across their entire domain infrastructure.
