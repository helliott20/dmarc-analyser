# DMARC Analyzer Implementation Plan

## Overview
Self-hosted DMARC analyzer similar to DMARCIAN with intuitive UI for understanding email authentication reports.

**Tech Stack:**
- Frontend: Next.js 16.0.7 + React 19 + Tailwind CSS + shadcn/ui
- Database: PostgreSQL 16 (in Docker)
- Job Queue: Redis 7 + BullMQ
- Auth: NextAuth.js v5 with Google Sign-In
- Email Import: Gmail API (OAuth2)
- Deployment: Docker Compose

**Report Types:** Both RUA (aggregate) and RUF (forensic)
**IP Intelligence:** Free geolocation via ip-api.com

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose                           │
├─────────────────┬──────────────┬──────────────┬────────────┤
│   Next.js App   │  PostgreSQL  │    Redis     │   Worker   │
│   (Port 3000)   │  (Port 5432) │ (Port 6379)  │  (BullMQ)  │
└────────┬────────┴──────────────┴──────────────┴─────┬──────┘
         │                                            │
         └────────────── Gmail API ───────────────────┘
```

**Components:**
| Service | Purpose |
|---------|---------|
| Next.js App | SSR dashboard, API routes, auth |
| PostgreSQL | DMARC reports, users, domains |
| Redis | Job queues, session cache |
| Worker | Gmail polling, XML parsing, alerts |

---

## Key Features (DMARCIAN Parity + Enterprise)

### Core DMARC Features
1. **Organizations** - Team workspaces with member management & roles
2. **Domain Overview** - Centralized dashboard with compliance indicators
3. **Detail Viewer** - Source-by-source breakdown, auth analysis
4. **Source Viewer** - Categorize legitimate vs suspicious senders
5. **Timeline** - Historical DMARC trends visualization
6. **Forensic Reports** - RUF individual failure analysis
7. **Alerts** - Notifications for issues (email/webhook)
8. **DNS Tools** - DMARC/SPF/DKIM lookup and validation
9. **Domain Verification** - DNS TXT record verification
10. **Subdomain Management** - Track subdomains, policy inheritance
11. **Known Sender Library** - Pre-labeled senders (Google, Mailchimp, SendGrid, etc.)
12. **DMARC Record Generator** - Wizard to create/update DMARC records
13. **Policy Recommendations** - Suggest when safe to move to quarantine/reject

### Enterprise/SaaS Features
14. **Audit Logs** - Track all user actions with timestamps
15. **API Keys** - Org-level API keys for integrations
16. **Webhooks** - Push events (new report, failures, alerts)
17. **Data Export** - CSV/PDF export of reports and analytics
18. **Scheduled Reports** - Weekly/monthly email summaries
19. **Data Retention Settings** - Configurable retention, GDPR deletion
20. **Session Management** - View/revoke active sessions
21. **Activity Notifications** - Email on login, settings changes

### Usability
22. **Onboarding Wizard** - Step-by-step setup for new orgs
23. **Dark Mode** - Theme preference
24. **Global Search** - Search across domains, reports, sources, IPs (Cmd+K)
25. **Help System** - Contextual tooltips, in-app documentation, glossary

### Branding/White-Label
26. **Custom Logo** - Upload org logo (header + emails)
27. **Custom Colors** - Primary/accent color scheme
28. **Custom Email Branding** - Logo in scheduled reports & alerts
29. **Custom Favicon** - Org favicon (optional)

---

## Database Schema (Drizzle ORM)

### Core Tables
```
users ──< org_members >── organizations ──< domains
   │                           │               │
   │                           │               ├── reports ──< records ──┬── dkim_results
   │                           │               │                         └── spf_results
   │                           │               ├── forensic_reports
   │                           │               ├── sources (aggregated IPs)
   │                           │               └── alerts
   │                           │
   │                           └── gmail_accounts (org-level import)
   │
   └── invitations (pending org invites)
```

### Organization Model
- **organizations** - Team/company container for domains
  - name, slug (URL-friendly)
  - created_by (owner user)
  - billing_email (optional)
  - **Branding fields:**
    - logo_url (uploaded image)
    - favicon_url (optional)
    - primary_color (hex, e.g., #3B82F6)
    - accent_color (hex)
  - **Settings:**
    - data_retention_days (default 365)
    - timezone (for scheduled reports)

- **org_members** - User membership with roles
  - user_id, organization_id
  - role: `owner` | `admin` | `member` | `viewer`
  - invited_by, joined_at

- **invitations** - Pending invites
  - email, organization_id, role
  - token, expires_at, accepted_at

### Member Roles & Permissions
| Role | Domains | Reports | Sources | Settings | Members |
|------|---------|---------|---------|----------|---------|
| Owner | Full | Full | Full | Full | Full |
| Admin | Full | Full | Full | Edit | Invite |
| Member | View | Full | Classify | View | - |
| Viewer | View | View | View | - | - |

### Key Tables
- **users** - Google SSO accounts
- **organizations** - Team containers
- **org_members** - User-org relationships with roles
- **domains** - Monitored domains (belong to org)
  - verification_token (unique string)
  - verification_method (`dns_txt` | `dns_cname`)
  - verified_at (null until verified)
  - verified_by (user who verified)
- **reports** - DMARC aggregate reports (metadata, policy)
- **records** - Individual report rows (source IP, counts, auth results)
- **dkim_results** / **spf_results** - Authentication details
- **forensic_reports** - RUF reports (individual failed emails)
- **sources** - Aggregated sender IPs with classification + geolocation
- **alerts** - Generated notifications
- **gmail_accounts** - OAuth tokens (org-level, for importing)

### Domain Verification Flow
1. User adds domain → system generates unique token (e.g., `dmarc-verify=abc123xyz`)
2. User adds DNS TXT record: `_dmarc-verify.example.com TXT "dmarc-verify=abc123xyz"`
3. User clicks "Verify" → system checks DNS for the token
4. If found → domain marked as verified, reports start processing
5. Unverified domains shown with warning, limited functionality

**Verification Methods:**
| Method | DNS Record |
|--------|------------|
| TXT (recommended) | `_dmarc-verify.example.com TXT "dmarc-verify=TOKEN"` |
| CNAME (alternative) | `_dmarc-verify.example.com CNAME TOKEN.verify.yourapp.com` |

**Unverified Domain Restrictions:**
- Cannot receive/process DMARC reports
- Shown with "Pending Verification" badge
- Auto-deleted after 7 days if not verified

### IP Geolocation Fields (sources table)
- country, city, region
- asn, asn_org (ISP/organization)
- Fetched from ip-api.com (free, 45 req/min)

### Enterprise Tables
- **audit_logs** - All user actions
  - org_id, user_id, action, entity_type, entity_id
  - old_value, new_value (JSON)
  - ip_address, user_agent, timestamp

- **api_keys** - Org API keys
  - org_id, name, key_hash (never store plaintext)
  - scopes (read, write, admin)
  - last_used_at, expires_at, revoked_at

- **webhooks** - Event subscriptions
  - org_id, url, secret (for signing)
  - events[] (report.new, alert.created, etc.)
  - is_active, last_triggered_at, failure_count

- **scheduled_reports** - Email report settings
  - org_id, domain_id (null = all domains)
  - frequency (daily, weekly, monthly)
  - recipients[], next_run_at

- **sessions** - Active user sessions
  - user_id, token_hash
  - ip_address, user_agent, location
  - created_at, last_active_at, expires_at

- **known_senders** - Pre-labeled sender library
  - name (Google, Mailchimp, SendGrid, etc.)
  - ip_ranges[], dkim_domains[]
  - category (marketing, transactional, corporate)
  - logo_url

- **subdomains** - Tracked subdomains
  - domain_id (parent), subdomain
  - policy_override (null = inherit)
  - first_seen, last_seen, message_count

---

## API Endpoints

### Auth
- `GET/POST /api/auth/[...nextauth]` - NextAuth handler

### Organizations
- `GET/POST /api/orgs` - List user's orgs / create new org
- `GET/PATCH/DELETE /api/orgs/[slug]` - Org CRUD
- `GET /api/orgs/[slug]/members` - List members
- `POST /api/orgs/[slug]/members/invite` - Send invite
- `DELETE /api/orgs/[slug]/members/[id]` - Remove member
- `PATCH /api/orgs/[slug]/members/[id]` - Update role
- `POST /api/invitations/[token]/accept` - Accept invite

### Domains
- `GET/POST /api/orgs/[slug]/domains` - List/create domains
- `GET/PATCH/DELETE /api/orgs/[slug]/domains/[id]` - Domain CRUD
- `GET /api/orgs/[slug]/domains/[id]/dns` - DNS record check
- `POST /api/orgs/[slug]/domains/[id]/verify` - Check verification status
- `POST /api/orgs/[slug]/domains/[id]/verify/resend` - Generate new token

### Reports
- `GET /api/domains/[id]/reports` - List with pagination
- `GET /api/domains/[id]/reports/summary` - Aggregated stats
- `GET /api/domains/[id]/reports/timeline` - Time series data

### Sources
- `GET /api/domains/[id]/sources` - List email sources
- `PATCH /api/domains/[id]/sources/[id]` - Classify source

### Forensic Reports (RUF)
- `GET /api/domains/[id]/forensic` - List forensic reports
- `GET /api/domains/[id]/forensic/[id]` - Forensic report detail

### Gmail
- `POST /api/gmail/connect` - OAuth flow
- `GET /api/gmail/callback` - OAuth callback
- `POST /api/gmail/accounts/[id]/sync` - Manual sync

### Tools
- `POST /api/tools/dns/lookup` - DNS lookup
- `POST /api/tools/dmarc/validate` - Validate DMARC record
- `POST /api/tools/dmarc/generate` - Generate DMARC record
- `POST /api/tools/spf/validate` - Validate SPF record

### Audit Logs
- `GET /api/orgs/[slug]/audit-logs` - List audit events (filterable)

### API Keys
- `GET /api/orgs/[slug]/api-keys` - List API keys
- `POST /api/orgs/[slug]/api-keys` - Create new key (returns key once)
- `DELETE /api/orgs/[slug]/api-keys/[id]` - Revoke key

### Webhooks
- `GET /api/orgs/[slug]/webhooks` - List webhooks
- `POST /api/orgs/[slug]/webhooks` - Create webhook
- `PATCH /api/orgs/[slug]/webhooks/[id]` - Update webhook
- `DELETE /api/orgs/[slug]/webhooks/[id]` - Delete webhook
- `POST /api/orgs/[slug]/webhooks/[id]/test` - Send test event

### Scheduled Reports
- `GET /api/orgs/[slug]/scheduled-reports` - List scheduled reports
- `POST /api/orgs/[slug]/scheduled-reports` - Create scheduled report
- `PATCH /api/orgs/[slug]/scheduled-reports/[id]` - Update
- `DELETE /api/orgs/[slug]/scheduled-reports/[id]` - Delete

### Sessions (User)
- `GET /api/user/sessions` - List active sessions
- `DELETE /api/user/sessions/[id]` - Revoke session
- `DELETE /api/user/sessions` - Revoke all except current

### Data Export
- `POST /api/orgs/[slug]/exports` - Request export (async)
- `GET /api/orgs/[slug]/exports/[id]` - Download export

### Subdomains
- `GET /api/orgs/[slug]/domains/[id]/subdomains` - List subdomains
- `PATCH /api/orgs/[slug]/domains/[id]/subdomains/[sub]` - Update policy

### Search
- `GET /api/orgs/[slug]/search?q=...` - Global search (domains, reports, sources, IPs)

---

## Background Jobs (BullMQ)

| Queue | Schedule | Purpose |
|-------|----------|---------|
| gmail-sync | Every 15 min | Fetch DMARC emails from Gmail |
| report-parser | On new email | Parse XML, store in DB |
| source-aggregator | Hourly | Update source statistics |
| alerts | On parse | Generate alerts for issues |
| dns-check | Every 6 hours | Verify DNS records |
| webhook-delivery | On event | Deliver webhook payloads (with retry) |
| scheduled-reports | Daily 6am | Generate and email scheduled reports |
| ip-enrichment | On new source | Fetch geolocation for new IPs |
| data-export | On request | Generate CSV/PDF exports |
| cleanup | Daily 2am | Delete expired data, unverified domains |

### Gmail Sync Flow
1. Search inbox: `subject:("Report domain:" OR "DMARC") has:attachment`
2. Extract .xml/.xml.gz/.zip attachments
3. Decompress and queue for parsing
4. Archive processed emails to label

---

## Page Structure

```
/login                              - Google Sign-In
/onboarding                         - New user setup wizard

/orgs                               - Organization list (or redirect)
/orgs/new                           - Create organization
/orgs/[slug]                        - Org dashboard (all domains overview)
/orgs/[slug]/domains                - Domain list
/orgs/[slug]/domains/new            - Add domain wizard
/orgs/[slug]/domains/[id]           - Domain overview
/orgs/[slug]/domains/[id]/verify    - Domain verification instructions
/orgs/[slug]/domains/[id]/reports   - Reports table (Detail Viewer)
/orgs/[slug]/domains/[id]/sources   - Source viewer
/orgs/[slug]/domains/[id]/subdomains - Subdomain management
/orgs/[slug]/domains/[id]/timeline  - Historical charts
/orgs/[slug]/domains/[id]/forensic  - RUF forensic reports
/orgs/[slug]/domains/[id]/alerts    - Domain alerts

/orgs/[slug]/settings               - Org settings (general)
/orgs/[slug]/settings/branding      - Logo, colors, favicon
/orgs/[slug]/settings/members       - Member management
/orgs/[slug]/settings/gmail         - Gmail account management
/orgs/[slug]/settings/api-keys      - API key management
/orgs/[slug]/settings/webhooks      - Webhook configuration
/orgs/[slug]/settings/scheduled-reports - Scheduled email reports
/orgs/[slug]/settings/audit-log     - Audit log viewer
/orgs/[slug]/settings/data          - Data retention & export

/tools                              - DNS tools (DMARC/SPF/DKIM)
/tools/generator                    - DMARC record generator

/help                               - Documentation home
/help/getting-started               - Quick start guide
/help/glossary                      - DMARC/SPF/DKIM terms
/help/[topic]                       - Topic-specific docs

/settings                           - User profile
/settings/sessions                  - Active sessions
/settings/notifications             - Email notification preferences
/settings/appearance                - Theme (dark mode)

/invitations/[token]                - Accept invite page
```

---

## Key Libraries

| Category | Libraries |
|----------|-----------|
| Framework | next@16, react@19, typescript |
| Database | drizzle-orm, postgres |
| Auth | next-auth, @auth/drizzle-adapter |
| Gmail | googleapis |
| Jobs | bullmq, ioredis |
| XML | fast-xml-parser, adm-zip |
| UI | tailwindcss, shadcn/ui, @radix-ui/*, lucide-react |
| Tables | @tanstack/react-table |
| Charts | recharts |
| Forms | react-hook-form, zod |
| Search | cmdk (command palette) |
| File Upload | uploadthing or local storage |

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Initialize Next.js 16 + TypeScript
- [ ] Set up Docker Compose (postgres, redis)
- [ ] Configure Drizzle ORM + migrations
- [ ] Implement NextAuth.js with Google provider
- [ ] Create basic layout with sidebar

### Phase 2: Core Data Model
- [ ] Domain CRUD API + pages
- [ ] Gmail OAuth flow (separate from sign-in)
- [ ] Gmail account management UI
- [ ] BullMQ setup + worker process

### Phase 3: Report Processing
- [ ] Gmail sync worker (fetch emails)
- [ ] DMARC XML parser (fast-xml-parser)
- [ ] Reports table with TanStack Table
- [ ] Report detail view

### Phase 4: Analytics & Visualization
- [ ] Dashboard overview cards
- [ ] Recharts timeline/compliance charts
- [ ] Source aggregation job
- [ ] Source viewer + classification

### Phase 5: DNS Tools & Alerts
- [ ] DNS lookup utilities
- [ ] DMARC/SPF/DKIM validators
- [ ] Alert generation logic
- [ ] Email notifications (nodemailer)

### Phase 6: Polish & Production
- [ ] Performance optimization
- [ ] Error handling + logging
- [ ] Security hardening
- [ ] Documentation

---

## Critical Files

| File | Purpose |
|------|---------|
| `src/db/schema.ts` | Database schema (all tables) |
| `src/jobs/workers/gmail-sync.worker.ts` | Gmail fetching |
| `src/jobs/workers/report-parser.worker.ts` | XML parsing |
| `src/lib/gmail/client.ts` | Gmail API integration |
| `src/app/(dashboard)/domains/[id]/page.tsx` | Domain overview |
| `docker-compose.yml` | Container orchestration |

---

## Docker Compose Services

```yaml
services:
  app:        # Next.js (port 3000)
  worker:     # BullMQ background jobs
  postgres:   # PostgreSQL 16 (port 5432)
  redis:      # Redis 7 (port 6379)
  bull-board: # Job monitoring UI (port 3001)
```

---

## Environment Variables

```bash
# Database
POSTGRES_PASSWORD=secure_password

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=openssl_rand_base64_32

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Optional: Alerts
SMTP_HOST=smtp.example.com
SMTP_USER=alerts@example.com
SMTP_PASSWORD=xxx
```

---

## Sources

- [parsedmarc Documentation](https://domainaware.github.io/parsedmarc/)
- [DMARCIAN Platform](https://dmarcian.com/dmarc-saas-platform/)
- [DMARC Aggregate Report Format](https://mxtoolbox.com/dmarc/details/what-do-dmarc-reports-look-like)
- [Gmail API OAuth2](https://developers.google.com/gmail/imap/xoauth2-protocol)
- [RUA vs RUF Reports](https://dmarcian.com/rua-vs-ruf/)
- [Next.js 16 Release](https://nextjs.org/blog/next-16)
