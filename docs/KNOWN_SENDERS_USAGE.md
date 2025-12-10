# Known Senders - Quick Start Guide

This guide explains how to populate your DMARC Analyser with known email service providers for automatic source classification.

## What Are Known Senders?

Known Senders are pre-configured email service providers that the DMARC Analyser can automatically identify and classify. This includes:

- Corporate email services (Google Workspace, Microsoft 365, etc.)
- Transactional email services (SendGrid, Postmark, Amazon SES, etc.)
- Marketing platforms (Mailchimp, HubSpot, Constant Contact, etc.)

When analyzing DMARC reports, the system will automatically match email sources against these known providers based on:
- IP addresses
- DKIM signing domains
- SPF domains

## Included Providers (18 Total)

### Corporate Email (4)
- Google Workspace / Gmail
- Microsoft 365 / Outlook / Hotmail
- Yahoo Mail
- Zoho Mail

### Transactional Email (7)
- Amazon SES
- SendGrid
- Mailgun
- Postmark
- SparkPost
- Zendesk
- Freshdesk
- Intercom

### Marketing Email (6)
- Mailchimp
- Sendinblue/Brevo
- Constant Contact
- HubSpot
- Salesforce Marketing Cloud
- Campaign Monitor

## Setup Methods

### Method 1: Command Line (Recommended for Initial Setup)

Run the npm script to seed your database:

```bash
npm run db:seed-senders
```

**Output Example:**
```
🌱 Seeding known senders...

✓ Seeded: Google Workspace
✓ Seeded: Microsoft 365
✓ Seeded: Amazon SES
...
✓ Seeded: Zoho Mail

✅ Seeding complete!
   Added: 18
   Skipped: 0
   Total: 18

🎉 Done!
```

### Method 2: API Endpoint (After Application is Running)

If your application is already running, you can use the admin API endpoint:

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Log in to your application

3. Call the seed endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/admin/seed-known-senders \
     -b "your-session-cookie"
   ```

4. Or use a tool like Postman/Insomnia with your session cookie

**API Response Example:**
```json
{
  "success": true,
  "message": "Known senders seeded successfully",
  "data": {
    "seeded": 18,
    "skipped": 0,
    "total": 18
  },
  "timestamp": "2025-12-10T12:00:00.000Z"
}
```

### Method 3: From Your Code

Import and call the seed function programmatically:

```typescript
import { seedKnownSenders } from '@/db/seeds/known-senders';

async function initialize() {
  const result = await seedKnownSenders();
  console.log(`Added ${result.seeded} providers`);
}
```

## Verifying the Seed

After seeding, you can verify the providers were added:

### Option 1: Using Database Studio
```bash
npm run db:studio
```
Navigate to the `known_senders` table and verify 18 records exist.

### Option 2: Using SQL
```sql
SELECT name, category, array_length(dkim_domains, 1) as dkim_count
FROM known_senders
WHERE is_global = true
ORDER BY category, name;
```

### Option 3: Using the API
```bash
curl http://localhost:3000/api/known-senders
```

## Re-running the Seed

The seed script is idempotent - you can run it multiple times safely:

```bash
npm run db:seed-senders
```

It will automatically skip providers that already exist:

```
🌱 Seeding known senders...

ℹ️  Found 18 existing global senders
   Skipping duplicates...

⊘ Skipped: Google Workspace (already exists)
⊘ Skipped: Microsoft 365 (already exists)
...

✅ Seeding complete!
   Added: 0
   Skipped: 18
   Total: 18
```

## How It Works

Once seeded, the DMARC Analyser will automatically:

1. **Match IP Addresses**: When processing DMARC reports, the system checks if the source IP falls within any known provider's IP ranges

2. **Match DKIM Domains**: When analyzing authentication results, it matches DKIM signing domains against known providers

3. **Classify Sources**: Sources are automatically tagged with the provider name and category

4. **Display in UI**: Known senders appear with logos and descriptions in your dashboard

## Customization

### Adding Your Own Providers

Edit `/src/db/seeds/known-senders.ts` and add entries to the `knownSendersData` array:

```typescript
{
  name: 'My Email Service',
  description: 'Internal company email system',
  category: 'corporate',
  website: 'https://example.com',
  logoUrl: 'https://example.com/logo.png',
  ipRanges: [
    '10.0.0.0/8',
    '192.168.0.0/16',
  ],
  dkimDomains: ['mail.example.com'],
  isGlobal: true,
}
```

Then re-run the seed:
```bash
npm run db:seed-senders
```

### Organization-Specific Senders

You can create providers that are only available to specific organizations by setting:
- `isGlobal: false`
- `organizationId: 'your-org-uuid'`

## Troubleshooting

### "Cannot find module" Error

Make sure you've installed dependencies:
```bash
npm install
```

### "Connection refused" Error

Ensure your database is running and `DATABASE_URL` is set in your `.env` file:
```bash
# Check if PostgreSQL is running
docker ps

# Or if using local PostgreSQL
pg_isready
```

### "Permission denied" Error

Verify your database user has INSERT permissions:
```sql
GRANT INSERT ON known_senders TO your_user;
```

### Providers Not Appearing in UI

1. Check the seed completed successfully
2. Verify records exist: `npm run db:studio`
3. Check your API endpoint returns data: `curl http://localhost:3000/api/known-senders`
4. Clear your browser cache and refresh

## Next Steps

After seeding known senders:

1. **Import DMARC Reports**: Upload or connect Gmail to import DMARC reports
2. **Review Sources**: Navigate to your domain's sources page
3. **Check Auto-Classification**: Sources should be automatically matched to known senders
4. **Customize**: Add organization-specific senders or remove unwanted ones

## Files Reference

- **Seed Script**: `/src/db/seeds/known-senders.ts`
- **API Endpoint**: `/src/app/api/admin/seed-known-senders/route.ts`
- **Schema Definition**: `/src/db/schema.ts` (knownSenders table)
- **Documentation**: `/src/db/seeds/README.md`

## Getting Help

If you encounter issues:

1. Check the console output for detailed error messages
2. Verify your database connection with: `npm run db:studio`
3. Review the logs in your terminal
4. Check the `/src/db/seeds/README.md` for detailed documentation

## Security Note

The seed endpoint (`/api/admin/seed-known-senders`) currently requires any authenticated user. In production, you may want to:

1. Restrict to admin users only
2. Add rate limiting
3. Add audit logging
4. Remove the endpoint entirely after initial setup

Modify `/src/app/api/admin/seed-known-senders/route.ts` to add these restrictions.
