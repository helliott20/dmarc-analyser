# User Settings - Quick Start Guide

## Setup Instructions

### 1. Apply Database Migration

Generate and apply the migration for the new `user_preferences` table:

```bash
# Generate migration
npm run db:generate

# Apply to database
npm run db:push
```

### 2. Verify Installation

All required files have been created. Verify the following directories exist:

```
src/app/(dashboard)/settings/         # Settings pages
src/components/settings/              # Settings components
src/app/api/user/                     # API routes
```

### 3. Test the Implementation

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Log in to your account

3. Click your avatar (bottom-left sidebar) → "Settings"

4. Test each page:
   - **Profile:** Update your display name
   - **Sessions:** View active sessions
   - **Notifications:** Toggle notification preferences
   - **Appearance:** Change theme (light/dark/system)

## Key Features

### Profile Page (`/settings`)
- View and edit your display name
- See linked Google account
- View account creation date

### Sessions Page (`/settings/sessions`)
- View all active sessions
- Revoke individual sessions
- Revoke all other sessions

### Notifications Page (`/settings/notifications`)
- **Login Alerts:** Email notifications for new device logins
- **Alert Notifications:** Critical DMARC alerts
- **Weekly Digest:** Summary emails

### Appearance Page (`/settings/appearance`)
- **System:** Follow OS theme
- **Light:** Always light mode
- **Dark:** Always dark mode

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/user/profile` | PATCH | Update display name |
| `/api/user/preferences` | PATCH | Update preferences |
| `/api/user/sessions` | DELETE | Revoke a session |
| `/api/user/sessions/revoke-all` | POST | Revoke all except current |

## Database Schema

The `user_preferences` table stores:
- Notification preferences (3 boolean flags)
- Theme preference (light/dark/system)
- Created/updated timestamps

## Access Settings

Users access settings via:
1. **Sidebar:** Click avatar → "Settings"
2. **Direct URL:** Navigate to `/settings`

## Navigation

Settings pages use a sidebar navigation:
- Profile
- Sessions
- Notifications
- Appearance

All pages share a consistent layout with the settings sidebar on the left.

## Default Values

When a user first accesses settings, defaults are:
- All notifications: **Enabled**
- Theme: **System**

## Common Tasks

### Add a New Setting

1. Create the database field in `userPreferences` table
2. Update the API route (`/api/user/preferences/route.ts`)
3. Add the form field to the appropriate settings page
4. Run `npm run db:generate` and `npm run db:push`

### Add a New Settings Page

1. Create page at `/src/app/(dashboard)/settings/your-page/page.tsx`
2. Add navigation item in `/src/app/(dashboard)/settings/layout.tsx`
3. Create component in `/src/components/settings/`

## Troubleshooting

**Theme not applying?**
- Check browser console for errors
- Verify `next-themes` is installed
- Ensure root layout has ThemeProvider

**Preferences not saving?**
- Check database migration was applied
- Verify API route is being called (Network tab)
- Check server logs for errors

**Sessions not showing?**
- Verify NextAuth.js is using database sessions
- Check `sessions` table in database
- Ensure user is logged in

## Next Steps

Consider implementing:
- Email notification sending
- Enhanced session tracking (device, location, IP)
- Two-factor authentication settings
- Account deletion
- Data export

See `USER_SETTINGS_IMPLEMENTATION.md` for detailed documentation.
