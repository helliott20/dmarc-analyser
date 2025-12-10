# Database Seeds

This directory contains seed scripts for populating the database with initial data.

## Known Senders Seed

The `known-senders.ts` file seeds the database with common email service providers to help with automatic source classification in DMARC analysis.

### Included Providers

The seed includes 18 major email service providers across three categories:

#### Corporate Email (5 providers)
- **Google Workspace** - Gmail and Google Workspace email services
- **Microsoft 365** - Office 365, Outlook, and Hotmail
- **Yahoo Mail** - Yahoo email service
- **Zoho Mail** - Zoho business email hosting

#### Transactional Email (7 providers)
- **Amazon SES** - Amazon Simple Email Service
- **SendGrid** - Twilio SendGrid platform
- **Mailgun** - Mailgun API service
- **Postmark** - Postmark transactional email
- **SparkPost** - SparkPost delivery service
- **Zendesk** - Zendesk support emails
- **Freshdesk** - Freshdesk support platform
- **Intercom** - Intercom messaging platform

#### Marketing Email (6 providers)
- **Mailchimp** - Mailchimp marketing automation
- **Sendinblue/Brevo** - Brevo marketing platform
- **Constant Contact** - Constant Contact marketing
- **HubSpot** - HubSpot marketing and CRM
- **Salesforce Marketing Cloud** - Enterprise marketing automation
- **Campaign Monitor** - Campaign Monitor platform

### Data Included

For each provider, the seed includes:
- **Name** - Display name
- **Description** - Brief description of the service
- **Category** - corporate, transactional, or marketing
- **Website** - Official website URL
- **Logo URL** - URL to the provider's logo image
- **IP Ranges** - Array of CIDR ranges used by the provider
- **DKIM Domains** - Array of domains used in DKIM signatures
- **Is Global** - All providers are marked as global (system-wide)

## Running Seeds

### Option 1: Command Line

Run the seed script directly using npm:

```bash
npm run db:seed-senders
```

This will:
- Connect to your database using the `DATABASE_URL` environment variable
- Insert all known senders
- Skip any that already exist (no duplicates)
- Output progress and results

### Option 2: API Endpoint

Call the admin API endpoint to seed from your application:

```bash
# Using curl (requires authentication)
curl -X POST http://localhost:3000/api/admin/seed-known-senders \
  -H "Cookie: your-session-cookie"

# Or visit the endpoint info
curl http://localhost:3000/api/admin/seed-known-senders
```

The API endpoint:
- Requires authentication (any logged-in user)
- Checks if providers already exist
- Returns detailed results including counts
- Can be called multiple times safely

### Option 3: Programmatically

Import and use the seed function in your code:

```typescript
import { seedKnownSenders } from '@/db/seeds/known-senders';

const result = await seedKnownSenders();
console.log(`Seeded ${result.seeded} providers`);
console.log(`Skipped ${result.skipped} duplicates`);
```

## Customizing Seeds

### Adding a New Provider

To add a new email provider, edit `known-senders.ts` and add an entry to the `knownSendersData` array:

```typescript
{
  name: 'Provider Name',
  description: 'Brief description of the service',
  category: 'transactional', // or 'marketing', 'corporate'
  website: 'https://provider.com',
  logoUrl: 'https://provider.com/logo.png',
  ipRanges: [
    '1.2.3.0/24',
    '5.6.7.0/24',
  ],
  dkimDomains: ['provider.com', 'mail.provider.com'],
  isGlobal: true,
}
```

### IP Ranges

IP ranges should be in CIDR notation. You can find IP ranges for most providers in their documentation:
- Google: https://www.gstatic.com/ipranges/goog.json
- Microsoft: https://docs.microsoft.com/en-us/microsoft-365/enterprise/urls-and-ip-address-ranges
- AWS: https://ip-ranges.amazonaws.com/ip-ranges.json
- Most ESP providers publish their IP ranges in their documentation

### DKIM Domains

DKIM domains are used to match email authentication headers. Check your DMARC reports to find which domains appear in DKIM signatures from each provider.

Common patterns:
- Direct service domains (e.g., `sendgrid.net`)
- Subdomains (e.g., `protection.outlook.com`)
- Related domains (e.g., `googlemail.com` for Gmail)

## Database Schema

The `knownSenders` table schema:

```sql
CREATE TABLE known_senders (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  logo_url TEXT,
  website VARCHAR(255),
  ip_ranges JSONB,           -- Array of CIDR strings
  dkim_domains JSONB,         -- Array of domain strings
  is_global BOOLEAN DEFAULT true,
  organization_id UUID,       -- NULL for global senders
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Organization-Specific Senders

While the seed script creates global senders (available to all organizations), you can also create organization-specific known senders:

```typescript
await db.insert(knownSenders).values({
  name: 'Custom Email Service',
  description: 'Our internal email system',
  category: 'corporate',
  ipRanges: ['10.0.0.0/8'],
  dkimDomains: ['internal.company.com'],
  isGlobal: false,
  organizationId: 'your-org-uuid',
});
```

Organization-specific senders will only be available for source matching within that organization.

## Maintenance

### Updating Provider Information

To update an existing provider's IP ranges or DKIM domains:

1. Update the data in `known-senders.ts`
2. Run the seed again - it will skip existing entries
3. Manually update the database if needed:

```sql
UPDATE known_senders
SET ip_ranges = '["new", "ranges"]'::jsonb,
    dkim_domains = '["new", "domains"]'::jsonb,
    updated_at = NOW()
WHERE name = 'Provider Name';
```

### Removing Providers

To remove a provider from future seeds, simply remove it from the `knownSendersData` array. To remove from the database:

```sql
DELETE FROM known_senders WHERE name = 'Provider Name' AND is_global = true;
```

Note: This will not affect sources that have already been matched to this provider.

## Troubleshooting

### Database Connection Issues

Ensure your `DATABASE_URL` environment variable is set:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/dmarc"
```

### Duplicate Key Errors

The seed uses `onConflictDoNothing()` to safely skip duplicates. If you see errors, check that your database has the appropriate unique constraints.

### Missing Providers in UI

After seeding, providers should appear in:
- Source classification dropdowns
- Known senders management pages
- Automatic matching algorithms

If they don't appear, check that:
1. The seed completed successfully
2. Your queries include global senders (`isGlobal = true`)
3. The frontend is fetching from the correct endpoint

## Related Files

- `/src/db/schema.ts` - Database schema definitions
- `/src/app/api/known-senders/route.ts` - API endpoint for fetching senders
- `/src/app/api/admin/seed-known-senders/route.ts` - Admin seeding endpoint
- `/drizzle/seed-known-senders.ts` - Legacy seed file (deprecated)
