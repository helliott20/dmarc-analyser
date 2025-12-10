# Known Sender Library - Implementation Guide

## Overview

The Known Sender Library is a feature that helps automatically identify and classify email sources in DMARC reports. It includes a database of known legitimate email service providers (Google, Microsoft, SendGrid, Mailchimp, etc.) and allows organizations to create custom senders specific to their needs.

## Features Implemented

### 1. Database Schema
- `knownSenders` table with fields for:
  - Name, description, category, logo URL, website
  - IP ranges (JSONB array of CIDR notation)
  - DKIM domains (JSONB array)
  - Global/org-specific flag
- `sources` table linked to `knownSenders` via `knownSenderId`

### 2. API Routes

#### Global Known Senders
- `GET /api/known-senders` - Fetch all global known senders

#### Organization-Specific Known Senders
- `GET /api/orgs/[slug]/known-senders` - Fetch all available senders (global + org-specific)
- `POST /api/orgs/[slug]/known-senders` - Create a custom known sender
- `GET /api/orgs/[slug]/known-senders/[senderId]` - Get specific sender
- `PATCH /api/orgs/[slug]/known-senders/[senderId]` - Update org-specific sender
- `DELETE /api/orgs/[slug]/known-senders/[senderId]` - Delete org-specific sender

#### Source Matching
- `POST /api/orgs/[slug]/domains/[domainId]/sources/match` - Auto-match sources to known senders
- `PATCH /api/orgs/[slug]/domains/[domainId]/sources/[sourceId]` - Manually link source to known sender

### 3. UI Components

#### Settings Page
- Location: `/orgs/[slug]/settings/senders`
- Features:
  - View global known senders (pre-configured)
  - Manage custom organization-specific senders
  - Add/Edit/Delete custom senders
  - Display IP ranges and DKIM domains

#### Updated Sources Page
- Location: `/orgs/[slug]/domains/[domainId]/sources`
- Features:
  - Display matched known senders in a new column
  - Show sender logo and global badge
  - Auto-match button to trigger matching
  - Match statistics in header

### 4. Auto-Matching Logic

#### Matching Criteria
1. **IP Range Matching**: Checks if source IP falls within any known sender's CIDR ranges
2. **DKIM Domain Matching**: Checks if DKIM signatures match known sender's domains
   - Supports exact match (e.g., `google.com`)
   - Supports subdomain match (e.g., `mail.google.com` matches `google.com`)

#### Matching Priority
1. IP range match (checked first)
2. DKIM domain match (checked if no IP match)
3. Returns first match found

### 5. Seed Data

Pre-configured global senders include:
- **Corporate**: Google Workspace, Microsoft 365, Yahoo Mail, Zoho Mail
- **Transactional**: SendGrid, Mailgun, Amazon SES, Postmark, SparkPost, Zendesk
- **Marketing**: Mailchimp, Constant Contact, Campaign Monitor, HubSpot, Salesforce Marketing Cloud

## Installation & Setup

### 1. Install Dependencies

```bash
npm install ip-address tsx
```

### 2. Run Database Migrations

The schema is already defined in `src/db/schema.ts`. Push it to your database:

```bash
npm run db:push
```

### 3. Seed Known Senders

Load the pre-configured global senders:

```bash
npm run db:seed-senders
```

## Usage

### For End Users

#### Viewing Known Senders
1. Navigate to `Settings > Known Senders`
2. View global senders (read-only)
3. View and manage custom senders

#### Creating Custom Senders
1. Click "Add Known Sender"
2. Fill in the form:
   - Name (required)
   - Category (required): marketing, transactional, corporate, security, other
   - Description (optional)
   - Website (optional)
   - Logo URL (optional)
   - IP Ranges (optional): One CIDR range per line (e.g., `192.0.2.0/24`)
   - DKIM Domains (optional): One domain per line (e.g., `example.com`)
3. Click "Create"

#### Auto-Matching Sources
1. Navigate to a domain's sources page
2. Click "Auto-Match" button
3. System will match sources based on IP ranges and DKIM domains
4. Toast notification shows how many sources were matched

### For Developers

#### Using the Matcher Functions

```typescript
import {
  matchSourceByIp,
  matchSourceByDkim,
  autoMatchSource,
  autoMatchDomainSources
} from '@/lib/known-sender-matcher';

// Match by IP
const sender = await matchSourceByIp('192.0.2.1', organizationId);

// Match by DKIM domain
const sender = await matchSourceByDkim('mail.google.com', organizationId);

// Auto-match a single source (tries IP then DKIM)
const sender = await autoMatchSource(sourceId, organizationId);

// Auto-match all unmatched sources for a domain
const result = await autoMatchDomainSources(domainId, organizationId);
// Returns: { matched: number, total: number }
```

#### Adding More Global Senders

Edit `drizzle/seed-known-senders.ts` and add to the `knownSendersData` array:

```typescript
{
  name: 'Example Service',
  description: 'Description of the service',
  category: 'transactional', // or marketing, corporate, security, other
  website: 'https://example.com',
  ipRanges: [
    '192.0.2.0/24',
    '198.51.100.0/24',
  ],
  dkimDomains: ['example.com', 'mail.example.com'],
  isGlobal: true,
}
```

Then re-run the seed script:

```bash
npm run db:seed-senders
```

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── known-senders/
│   │   │   └── route.ts                           # Global senders API
│   │   └── orgs/[slug]/
│   │       ├── known-senders/
│   │       │   ├── route.ts                       # Org senders CRUD
│   │       │   └── [senderId]/route.ts           # Individual sender
│   │       └── domains/[domainId]/
│   │           └── sources/
│   │               ├── match/route.ts            # Auto-match API
│   │               └── [sourceId]/route.ts       # Update source
│   └── (dashboard)/
│       └── orgs/[slug]/
│           ├── settings/
│           │   └── senders/page.tsx              # Settings page
│           └── domains/[domainId]/
│               └── sources/page.tsx              # Updated sources page
├── components/
│   ├── known-senders/
│   │   ├── known-sender-dialog.tsx               # Add/Edit dialog
│   │   ├── known-sender-card.tsx                 # Sender card
│   │   └── add-known-sender-button.tsx           # Add button
│   └── sources/
│       └── auto-match-button.tsx                 # Auto-match button
├── lib/
│   └── known-sender-matcher.ts                   # Matching logic
└── db/
    └── schema.ts                                 # Database schema

drizzle/
└── seed-known-senders.ts                         # Seed data script
```

## API Response Examples

### GET /api/orgs/[slug]/known-senders

```json
[
  {
    "id": "uuid",
    "name": "SendGrid",
    "description": "Twilio SendGrid email delivery platform",
    "category": "transactional",
    "logoUrl": null,
    "website": "https://sendgrid.com",
    "ipRanges": ["167.89.0.0/17", "168.245.0.0/16"],
    "dkimDomains": ["sendgrid.net", "sendgrid.me"],
    "isGlobal": true,
    "organizationId": null,
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
]
```

### POST /api/orgs/[slug]/domains/[domainId]/sources/match

Request:
```json
{
  "sourceId": "optional-source-id"
}
```

Response:
```json
{
  "matched": 5,
  "total": 10
}
```

## Performance Considerations

1. **IP Range Matching**: Uses the `ip-address` library for efficient CIDR matching
2. **Database Queries**: Fetches all known senders once per match operation (cached in memory during operation)
3. **Batch Matching**: `autoMatchDomainSources` processes all unmatched sources in a single operation
4. **Indexing**: The `sources.knownSenderId` field should be indexed for faster lookups

## Security & Permissions

- **Viewing**: All organization members can view known senders
- **Creating/Editing/Deleting**: Only owners and admins can modify custom senders
- **Global Senders**: Cannot be modified through the UI (only via seed script)
- **Org-Specific Senders**: Can only be modified by the owning organization

## Future Enhancements

Potential improvements for future versions:

1. **Background Jobs**: Auto-match sources when new reports are imported
2. **Machine Learning**: Suggest known senders based on patterns
3. **Import/Export**: Allow importing sender definitions from files
4. **Bulk Operations**: Match multiple domains at once
5. **Sender Analytics**: Track which senders are most common across organizations
6. **API Rate Limiting**: Prevent abuse of auto-match endpoints
7. **Regex Matching**: Support regex patterns for DKIM domains
8. **ASN Matching**: Match by Autonomous System Numbers in addition to IP ranges

## Troubleshooting

### Matching Not Working

1. Check IP ranges are in valid CIDR notation
2. Verify DKIM domains are correctly formatted
3. Ensure `ip-address` package is installed
4. Check browser console for errors
5. Verify database connection

### Seed Script Failing

1. Ensure database is running
2. Check `DATABASE_URL` environment variable
3. Verify schema is up to date with `npm run db:push`
4. Check for duplicate entries (script uses `onConflictDoNothing`)

## Support

For issues or questions:
1. Check this guide
2. Review the code comments
3. Check the database schema
4. Test API endpoints directly using tools like Postman
