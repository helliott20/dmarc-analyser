# DMARC Analyser

A self-hosted DMARC, SPF, and DKIM report analyzer with an intuitive web interface. Monitor your email authentication and protect your domain from spoofing.

## Features

- **DMARC Report Analysis** - Parse and visualize aggregate (RUA) and forensic (RUF) reports
- **Gmail Integration** - Automatically import DMARC reports from Gmail
- **Multi-Organization Support** - Manage multiple organizations with role-based access
- **Domain Verification** - Verify domain ownership via DNS TXT records
- **Source Classification** - Identify legitimate vs suspicious email sources
- **IP Geolocation** - See where emails are coming from globally
- **DNS Tools** - Check DMARC, SPF, and DKIM records
- **Customizable Branding** - Add your own logo and colors

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- A Google Cloud project (for OAuth)

### 1. Clone and Install

```bash
git clone <your-repo-url>
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
DATABASE_URL=postgresql://dmarc:dmarc_dev_password@localhost:5432/dmarc_analyser

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
npm run db:push
```

### 5. Start the Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Production Deployment

### Using Docker

Build and run the production container:

```bash
docker build -t dmarc-analyser .
docker run -p 3000:3000 --env-file .env.production dmarc-analyser
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `NEXTAUTH_URL` | Your application URL | Yes |
| `NEXTAUTH_SECRET` | Random secret for sessions | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `GMAIL_CLIENT_ID` | Gmail API client ID (can be same as above) | For Gmail import |
| `GMAIL_CLIENT_SECRET` | Gmail API client secret | For Gmail import |

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   PostgreSQL    │
│   (Frontend +   │     │   (Database)    │
│    API Routes)  │     └─────────────────┘
└─────────────────┘              │
        │                        │
        ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│   Gmail API     │     │     Redis       │
│  (Report Import)│     │  (Job Queue)    │
└─────────────────┘     └─────────────────┘
```

## Database Schema

The application uses 22 tables organized into:

- **Authentication** - Users, sessions, accounts
- **Organizations** - Organizations, members, invitations
- **Domains** - Domains, verification, DNS records
- **Reports** - DMARC aggregate and forensic reports
- **Sources** - Email source IPs with geolocation
- **Enterprise** - Audit logs, API keys, webhooks

## Development

### Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── (auth)/         # Authentication pages
│   ├── (dashboard)/    # Dashboard pages
│   └── api/            # API routes
├── components/         # React components
│   ├── ui/            # shadcn/ui components
│   ├── dashboard/     # Dashboard components
│   ├── domains/       # Domain management
│   └── gmail/         # Gmail integration
├── db/                 # Database schema and client
├── lib/               # Utility libraries
│   ├── auth.ts        # NextAuth configuration
│   ├── gmail.ts       # Gmail API utilities
│   └── dmarc-parser.ts # DMARC XML parser
└── types/             # TypeScript types
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:generate` | Generate migrations |

### Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js v5
- **UI**: shadcn/ui + Tailwind CSS
- **Email**: Gmail API for report import

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

- [Google OAuth Setup](docs/google-oauth-setup.md) - Configure Google Sign-In and Gmail API
- [PLAN.md](PLAN.md) - Full implementation plan and feature list

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details.
