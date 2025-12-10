# Data Export Feature Implementation

This document describes the Data Export feature implementation for the DMARC analyzer.

## Overview

The Data Export feature allows users to export DMARC data in CSV format with date range filtering. Users can export:
- Reports (aggregate DMARC reports with detailed records)
- Sources (IP sources with geolocation and classification data)
- Timeline (daily aggregated message statistics)

## Components Created

### 1. CSV Utility Library (`/src/lib/csv.ts`)

A comprehensive CSV generation utility that:
- Provides type-safe interfaces for export data
- Handles CSV field escaping (commas, quotes, newlines)
- Generates properly formatted CSV files for all three export types
- Creates appropriate HTTP responses with correct headers

**Export Formats:**

**Reports CSV:**
- Report ID, Org Name, Domain, Date Range Start, Date Range End, Source IP, Source Count, SPF Result, DKIM Result, DMARC Disposition, Policy Override

**Sources CSV:**
- Source IP, Hostname, Country, City, ASN, Org Name, Total Messages, Pass Count, Fail Count, First Seen, Last Seen, Classification

**Timeline CSV:**
- Date, Total Messages, Passed, Failed, Pass Rate, Unique Sources

### 2. API Endpoints

#### Domain-Specific Export (`/api/orgs/[slug]/domains/[domainId]/export`)

**POST** request with query parameters:
- `type`: Required. One of 'reports', 'sources', or 'timeline'
- `dateFrom`: Optional. ISO date string for start date filter
- `dateTo`: Optional. ISO date string for end date filter

Returns a CSV file as download with proper Content-Disposition headers.

**Features:**
- Access control (verifies user has access to the domain)
- Date range filtering
- Efficient database queries with proper joins
- Aggregation for timeline data (groups by date, counts unique sources)

#### Organization-Wide Export (`/api/orgs/[slug]/export`)

**POST** request with same query parameters as domain-specific export.

Exports data across ALL domains in the organization.

**Features:**
- Exports data from all domains in the organization
- Same date filtering capabilities
- Includes domain name in each row for multi-domain exports
- Filename includes "all-domains" to distinguish from single-domain exports

### 3. ExportButton Component (`/src/components/export-button.tsx`)

A reusable client component that provides:
- Dropdown menu with three export type options (Reports, Sources, Timeline)
- Date range picker in a popover dialog
- Loading states during export generation
- Automatic file download with proper filename
- Error handling with user feedback

**Props:**
- `orgSlug`: Organization slug (required)
- `domainId`: Domain ID (optional - if omitted, triggers org-wide export)
- `variant`: Button variant (default: 'outline')
- `size`: Button size (default: 'default')

**User Flow:**
1. User clicks "Export CSV" button
2. Dropdown menu shows three export options
3. User selects export type (Reports/Sources/Timeline)
4. Popover opens with date range inputs
5. User can optionally set date filters or leave empty for all data
6. Click "Export" to download or "Cancel" to close
7. File downloads automatically with descriptive filename

### 4. Integration into Pages

The ExportButton has been added to three key pages:

**Reports Page** (`/orgs/[slug]/domains/[domainId]/reports`):
- Button placed in header next to title
- Exports all reports with detailed record data

**Sources Page** (`/orgs/[slug]/domains/[domainId]/sources`):
- Button placed alongside Auto-Match and Enrichment buttons
- Exports all IP sources with classification data

**Timeline Page** (`/orgs/[slug]/domains/[domainId]/timeline`):
- Button placed in header on the right side
- Exports daily aggregated statistics

## Technical Implementation Details

### Security
- All endpoints verify user authentication
- Access control checks ensure users can only export data they have permission to view
- CSV field escaping prevents injection attacks

### Performance
- Efficient database queries using Drizzle ORM
- Uses `inArray` for batch operations
- Aggregation done in application layer for flexibility
- Proper indexes assumed on database tables

### Data Handling
- Timeline data groups records by date and counts unique sources
- Pass/fail logic: DMARC passes if either SPF or DKIM passes
- Dates formatted as ISO strings in CSV for consistency
- Numbers preserved without localization in CSV

### Browser Compatibility
- Uses standard Blob API for file downloads
- Creates temporary download links that are cleaned up
- Filenames include timestamp for uniqueness
- Content-Disposition header ensures proper download behavior

## File Structure

```
src/
├── lib/
│   └── csv.ts                           # CSV generation utilities
├── components/
│   └── export-button.tsx                # Reusable export button component
└── app/
    └── api/
        └── orgs/
            ├── [slug]/
            │   ├── export/
            │   │   └── route.ts         # Org-wide export endpoint
            │   └── domains/
            │       └── [domainId]/
            │           └── export/
            │               └── route.ts # Domain-specific export endpoint
            └── (dashboard)/
                └── orgs/
                    └── [slug]/
                        └── domains/
                            └── [domainId]/
                                ├── reports/page.tsx   # Reports page with export
                                ├── sources/page.tsx   # Sources page with export
                                └── timeline/page.tsx  # Timeline page with export
```

## Usage Examples

### Domain-Specific Export
```typescript
// Export all reports for a specific domain
POST /api/orgs/acme/domains/123-456/export?type=reports

// Export sources with date filter
POST /api/orgs/acme/domains/123-456/export?type=sources&dateFrom=2024-01-01&dateTo=2024-12-31
```

### Organization-Wide Export
```typescript
// Export all reports across all domains
POST /api/orgs/acme/export?type=reports

// Export timeline data with filters
POST /api/orgs/acme/export?type=timeline&dateFrom=2024-06-01
```

## Future Enhancements

Potential improvements for future iterations:
1. Add support for JSON and Excel formats
2. Implement streaming for very large exports
3. Add scheduled/automated exports
4. Include email delivery of exports
5. Add more granular filtering options (by source type, disposition, etc.)
6. Implement export quotas/rate limiting
7. Add progress indicators for large exports
8. Store export history and allow re-download
9. Support custom column selection
10. Add compression (ZIP) for large files

## Testing Recommendations

When testing this feature:
1. Test with empty datasets (should return empty CSV with headers)
2. Test with very large datasets (10,000+ records)
3. Test date range filtering edge cases
4. Test CSV escaping with special characters in data
5. Test permission boundaries (accessing other orgs' data)
6. Test filename generation and download behavior
7. Test org-wide export with multiple domains
8. Test concurrent export requests
9. Test export cancellation (closing popover)
10. Test with various date formats and timezones
