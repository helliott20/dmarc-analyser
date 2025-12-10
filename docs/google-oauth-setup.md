# Google OAuth Setup Guide

This guide walks you through setting up Google OAuth for the DMARC Analyzer. You'll need to configure two OAuth consent screens and credentials:

1. **Google Sign-In** - For user authentication
2. **Gmail API** - For importing DMARC reports from Gmail (optional, but recommended)

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top of the page
3. Click **New Project**
4. Enter a project name (e.g., "DMARC Analyzer")
5. Click **Create**
6. Wait for the project to be created, then select it from the project dropdown

## Step 2: Configure OAuth Consent Screen

Before creating credentials, you need to configure the OAuth consent screen.

1. In the left sidebar, navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace and want internal only)
3. Click **Create**

### Fill in the App Information

| Field | Value |
|-------|-------|
| App name | DMARC Analyzer |
| User support email | Your email address |
| App logo | (Optional) Upload your logo |
| Application home page | `https://your-domain.com` or `http://localhost:3000` for development |
| Application privacy policy link | `https://your-domain.com/privacy` (can add later) |
| Application terms of service link | `https://your-domain.com/terms` (can add later) |
| Authorized domains | Your domain (e.g., `your-domain.com`) |
| Developer contact email | Your email address |

Click **Save and Continue**

### Configure Scopes

1. Click **Add or Remove Scopes**
2. Add the following scopes:

**For Google Sign-In (required):**
- `../auth/userinfo.email`
- `../auth/userinfo.profile`
- `openid`

**For Gmail Import (optional but recommended):**
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.modify`

3. Click **Update**
4. Click **Save and Continue**

### Test Users (Development Only)

If your app is in "Testing" mode, you need to add test users:

1. Click **Add Users**
2. Enter the email addresses of users who will test the application
3. Click **Add**
4. Click **Save and Continue**

### Summary

Review your settings and click **Back to Dashboard**

## Step 3: Enable Required APIs

1. In the left sidebar, navigate to **APIs & Services** → **Library**
2. Search for and enable the following APIs:

### Required APIs

| API | Purpose |
|-----|---------|
| **Google+ API** or **Google People API** | User profile information |

### Optional APIs (for Gmail Import)

| API | Purpose |
|-----|---------|
| **Gmail API** | Reading DMARC report emails |

To enable an API:
1. Click on the API name
2. Click **Enable**

## Step 4: Create OAuth Credentials

1. In the left sidebar, navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Web application** as the application type

### Configure the OAuth Client

| Field | Value |
|-------|-------|
| Name | DMARC Analyzer Web Client |
| Authorized JavaScript origins | `http://localhost:3000` (add your production URL later) |
| Authorized redirect URIs | See below |

### Authorized Redirect URIs

Add the following redirect URIs:

**For Development:**
```
http://localhost:3000/api/auth/callback/google
```

**For Production (replace with your domain):**
```
https://your-domain.com/api/auth/callback/google
```

**For Gmail OAuth (if using Gmail import):**
```
http://localhost:3000/api/orgs/[slug]/gmail/callback
https://your-domain.com/api/orgs/[slug]/gmail/callback
```

> **Note:** The `[slug]` in Gmail callback URLs is a literal placeholder. When users connect Gmail, the actual organization slug will be used.

4. Click **Create**

### Save Your Credentials

After creating the OAuth client, you'll see a dialog with:
- **Client ID** - A long string ending in `.apps.googleusercontent.com`
- **Client Secret** - A shorter secret string

**Copy both values** - you'll need them for your `.env.local` file.

## Step 5: Configure Environment Variables

Create or update your `.env.local` file in the project root:

```bash
# Google OAuth (for Sign-In)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Gmail API (uses same credentials, or create separate ones)
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-a-random-secret-here
```

### Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Or use Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 6: Test the Configuration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000` in your browser

3. Click **Sign in with Google**

4. You should be redirected to Google's sign-in page

5. After signing in, you should be redirected back to the application

## Troubleshooting

### "Access Blocked: This app's request is invalid"

- Check that your redirect URIs exactly match what's configured in Google Cloud Console
- Ensure there are no trailing slashes
- Verify the protocol (http vs https) matches

### "Error 403: access_denied"

- Make sure your email is added as a test user (if app is in Testing mode)
- Verify the OAuth consent screen is properly configured

### "Error 400: redirect_uri_mismatch"

- The redirect URI in your request doesn't match any authorized redirect URI
- Double-check the URIs in Google Cloud Console
- For Gmail OAuth, ensure the organization slug in the URL is valid

### Gmail Import Not Working

- Verify the Gmail API is enabled in your Google Cloud project
- Check that the Gmail scopes are added to the OAuth consent screen
- Ensure `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` are set in `.env.local`

## Production Deployment

When deploying to production:

1. **Update Authorized Origins and Redirect URIs** in Google Cloud Console to include your production domain

2. **Update Environment Variables:**
   ```bash
   NEXTAUTH_URL=https://your-domain.com
   ```

3. **Publish Your App** (if allowing external users):
   - Go to OAuth consent screen
   - Click **Publish App**
   - Complete any required verification steps

### App Verification

If your app uses sensitive scopes (like Gmail), Google may require verification:

1. You'll need to provide:
   - Privacy policy
   - Terms of service
   - Demonstration video
   - Explanation of how you use the data

2. The verification process can take several weeks

3. During verification, you can still use the app with test users

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use different credentials** for development and production
3. **Rotate secrets** periodically
4. **Limit scopes** to only what's necessary
5. **Review connected apps** in your Google Account security settings

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Google Cloud Console](https://console.cloud.google.com/)
