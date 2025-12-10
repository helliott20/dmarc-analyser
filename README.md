# DMARC Analyzer

A self-hosted DMARC, SPF, and DKIM report analyzer with an intuitive web interface. Monitor your email authentication and protect your domain from spoofing.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

### Core
- **DMARC Report Analysis** - Parse and visualize aggregate (RUA) and forensic (RUF) reports
- **Gmail Integration** - Automatically import DMARC reports from Gmail
- **Multi-Organization Support** - Manage multiple organizations with role-based access
- **Domain Verification** - Verify domain ownership via DNS TXT records
- **Source Classification** - Identify legitimate vs suspicious email sources with "Known Senders"
- **IP Geolocation** - See where emails are coming from globally
- **Subdomain Discovery** - Track and analyze subdomains from reports

### Tools
- **DNS Lookup** - Check DMARC, SPF, and DKIM records for any domain
- **DMARC Generator** - Create DMARC records with a guided wizard
- **Policy Recommendations** - Get suggestions based on your authentication results

### Monitoring & Alerts
- **Alert Rules** - Configure alerts for authentication failures, new sources, policy violations
- **Email Notifications** - Get notified when issues are detected
- **Webhooks** - Send alerts to Slack, Discord, or custom endpoints
- **Scheduled Reports** - Weekly/monthly email summaries

### Enterprise Features
- **Audit Logs** - Track all user actions and changes
- **API Keys** - Programmatic access to your data
- **Data Export** - Export reports in CSV/JSON format
- **Custom Branding** - Add your organization's logo and colors
- **Team Management** - Invite members with owner/admin/member roles

### User Experience
- **Help Center** - Built-in documentation and FAQs
- **Command Palette** - Quick navigation with Cmd+K
- **Dark Mode** - Light and dark theme support
- **Onboarding Wizard** - Guided setup for new users

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- A Google Cloud project (for OAuth)

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/dmarc-analyser.git
cd dmarc-analyser
npm install
```

### 2. Start the Database

```bash
docker-compose up -d
```

This starts PostgreSQL and Redis containers.

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your configuration:

```bash
# Database (default works with docker-compose)
DATABASE_URL=postgresql://dmarc:dmarc_dev_password@localhost:5432/dmarc_analyzer

# Google OAuth - See docs/google-oauth-setup.md
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
```

See [Google OAuth Setup Guide](docs/google-oauth-setup.md) for detailed instructions.

### 4. Initialize the Database

```bash
npx drizzle-kit push
```

### 5. Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js v5 (Auth.js)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Charts**: Recharts
- **Email**: Gmail API for report import

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Dashboard pages
│   ├── api/            # API routes
│   └── help/           # Help center
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   ├── dashboard/     # Dashboard components
│   ├── domains/       # Domain management
│   └── gmail/         # Gmail integration
├── db/                 # Database schema and client
├── lib/               # Utility libraries
└── types/             # TypeScript types
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Your application URL | Yes |
| `NEXTAUTH_SECRET` | Random secret for sessions | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |

## Setting Up DMARC

To receive DMARC reports, add a DMARC record to your domain's DNS:

```
_dmarc.yourdomain.com TXT "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com"
```

Where `dmarc@yourdomain.com` is a Gmail account connected to this analyzer.

### DMARC Policy Options

| Policy | Description |
|--------|-------------|
| `p=none` | Monitor only, don't affect delivery |
| `p=quarantine` | Mark suspicious emails as spam |
| `p=reject` | Reject emails that fail authentication |

Start with `p=none` to monitor your email sources before enforcing.

## Documentation

See the [docs](docs/) folder for detailed documentation:

- [Google OAuth Setup](docs/google-oauth-setup.md)
- [Alerts Implementation](docs/ALERTS_IMPLEMENTATION.md)
- [Webhook Integration](docs/WEBHOOK_INTEGRATION_GUIDE.md)
- [Audit Logs](docs/AUDIT_LOGS.md)
- [Known Senders](docs/KNOWN_SENDERS_GUIDE.md)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) file for details.
