# User Settings Implementation

This document describes the user settings implementation for the DMARC Analyzer application.

## Overview

A complete user settings system has been implemented at `/settings`, separate from organization settings. This includes personal profile management, session management, notification preferences, and appearance settings.

## Features Implemented

### 1. Profile Page (`/settings`)

**Location:** `/src/app/(dashboard)/settings/page.tsx`

**Features:**
- Display user avatar, name, email
- Show account creation date
- Show which Google account is linked
- Update display name
- Email verification badge

**Components:**
- `ProfileForm` - Form for updating user profile information

### 2. Sessions Page (`/settings/sessions`)

**Location:** `/src/app/(dashboard)/settings/sessions/page.tsx`

**Features:**
- List all active sessions
- Highlight current session
- Show session expiration time
- Revoke individual sessions
- Revoke all other sessions (keeps current session)

**Components:**
- `SessionsClient` - Client-side session management interface

**Notes:**
- Currently shows basic session information (session token and expiration)
- In production, you should enhance the sessions table to track:
  - User agent (browser/device info)
  - IP address
  - Geographic location
  - Last activity timestamp

### 3. Notifications Page (`/settings/notifications`)

**Location:** `/src/app/(dashboard)/settings/notifications/page.tsx`

**Features:**
- Email notification preferences:
  - **Login Alerts** - Notifications for new device/location logins
  - **Alert Notifications** - Critical DMARC alerts across all organizations
  - **Weekly Digest** - Summary of DMARC reports and analytics
- Toggle switches for each preference
- Organized by category (Security, Alerts, Digest)

**Components:**
- `NotificationsForm` - Form with switches for notification preferences

### 4. Appearance Page (`/settings/appearance`)

**Location:** `/src/app/(dashboard)/settings/appearance/page.tsx`

**Features:**
- Theme selection: System, Light, Dark
- Uses next-themes for theme switching
- Live preview of theme
- Saves preference to database

**Components:**
- `AppearanceForm` - Theme selection interface with visual preview

## Database Schema

### New Table: `user_preferences`

```typescript
export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),

  // Notification preferences
  emailLoginAlerts: boolean('email_login_alerts').default(true).notNull(),
  emailWeeklyDigest: boolean('email_weekly_digest').default(true).notNull(),
  emailAlertNotifications: boolean('email_alert_notifications').default(true).notNull(),

  // Appearance preferences
  theme: varchar('theme', { length: 20 }).default('system').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Migration Required:**
Run the following command to generate and apply the migration:
```bash
npm run db:generate
npm run db:push
```

## API Routes

### 1. Update Profile (`PATCH /api/user/profile`)

**Request Body:**
```json
{
  "name": "John Doe"
}
```

**Features:**
- Updates user's display name
- Validates input using Zod schema
- Requires authentication

### 2. Update Preferences (`PATCH /api/user/preferences`)

**Request Body:**
```json
{
  "emailLoginAlerts": true,
  "emailWeeklyDigest": true,
  "emailAlertNotifications": true,
  "theme": "dark"
}
```

**Features:**
- Updates user notification and appearance preferences
- Creates preferences record if it doesn't exist
- Supports partial updates

### 3. Revoke Session (`DELETE /api/user/sessions`)

**Request Body:**
```json
{
  "sessionToken": "session_token_here"
}
```

**Features:**
- Revokes a specific user session
- Ensures users can only revoke their own sessions

### 4. Revoke All Sessions (`POST /api/user/sessions/revoke-all`)

**Features:**
- Revokes all sessions except the current one
- Identifies current session from cookies
- Prevents accidental lockout

## Layout and Navigation

### Settings Layout

**Location:** `/src/app/(dashboard)/settings/layout.tsx`

**Features:**
- Consistent layout for all settings pages
- Sidebar navigation with icons
- Responsive design (sidebar collapses on mobile)
- Breadcrumb-style header

### Settings Sidebar Navigation

**Component:** `SettingsSidebarNav`
**Location:** `/src/components/settings/settings-sidebar-nav.tsx`

**Navigation Items:**
- Profile (User icon)
- Sessions (Shield icon)
- Notifications (Bell icon)
- Appearance (Monitor icon)

## Integration Points

### 1. App Sidebar

The main app sidebar (`/src/components/dashboard/app-sidebar.tsx`) already includes a link to `/settings` in the user dropdown menu (bottom-left corner).

### 2. Theme Provider

The app uses `next-themes` which is already configured in `/src/app/layout.tsx`. The appearance settings integrate seamlessly with this existing setup.

### 3. Session Management

Uses NextAuth.js sessions from the existing authentication setup. Session tokens are managed via the `sessions` table in the database.

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── settings/
│   │       ├── layout.tsx              # Settings layout with sidebar
│   │       ├── page.tsx                # Profile page
│   │       ├── sessions/
│   │       │   └── page.tsx            # Sessions page
│   │       ├── notifications/
│   │       │   └── page.tsx            # Notifications page
│   │       └── appearance/
│   │           └── page.tsx            # Appearance page
│   └── api/
│       └── user/
│           ├── profile/
│           │   └── route.ts            # Update profile API
│           ├── preferences/
│           │   └── route.ts            # Update preferences API
│           └── sessions/
│               ├── route.ts            # Revoke session API
│               └── revoke-all/
│                   └── route.ts        # Revoke all sessions API
└── components/
    └── settings/
        ├── settings-sidebar-nav.tsx    # Sidebar navigation
        ├── profile-form.tsx            # Profile update form
        ├── sessions-client.tsx         # Session management
        ├── notifications-form.tsx      # Notification preferences
        └── appearance-form.tsx         # Theme selection
```

## Usage

### Accessing Settings

Users can access their settings by:
1. Clicking their avatar in the bottom-left sidebar
2. Selecting "Settings" from the dropdown menu
3. Navigating to any settings page using the sidebar

### Default Preferences

When a user first accesses settings, default preferences are created:
- All email notifications: Enabled
- Theme: System (follows OS preference)

### Theme Switching

Themes are applied immediately upon selection and persist across sessions. The theme preference is stored both in:
- Database (for persistence across devices)
- Local storage (for immediate application via next-themes)

## Security Considerations

### 1. Session Management

- Users can only revoke their own sessions
- Current session is protected from accidental revocation
- Session tokens are validated before deletion

### 2. Profile Updates

- Email cannot be changed (managed by OAuth provider)
- Name updates are validated and sanitized
- All updates require authentication

### 3. API Security

- All API routes require valid session
- Request data is validated using Zod schemas
- Database queries use parameterized queries via Drizzle ORM

## Future Enhancements

### Session Tracking

Consider enhancing the sessions table to include:
```sql
ALTER TABLE sessions ADD COLUMN user_agent TEXT;
ALTER TABLE sessions ADD COLUMN ip_address INET;
ALTER TABLE sessions ADD COLUMN location VARCHAR(100);
ALTER TABLE sessions ADD COLUMN last_activity TIMESTAMP;
```

This would enable:
- Display of device type (desktop/mobile)
- Browser identification
- Geographic location
- Last activity timestamps

### Email Notifications

Implement actual email sending for:
- Login alerts (new device/location)
- Weekly digests (DMARC summary)
- Alert notifications (critical issues)

Recommended services:
- SendGrid
- AWS SES
- Resend

### Additional Settings

Consider adding:
- Language preferences
- Timezone selection
- Data export options
- Account deletion

## Testing

### Manual Testing Checklist

- [ ] Profile page loads and displays user information
- [ ] Profile name can be updated successfully
- [ ] Sessions page shows all active sessions
- [ ] Current session is highlighted
- [ ] Individual sessions can be revoked
- [ ] "Revoke all" keeps current session active
- [ ] Notification preferences can be toggled
- [ ] Theme changes apply immediately
- [ ] Theme preference persists after refresh
- [ ] All API routes handle errors gracefully
- [ ] Unauthorized access is blocked

### Database Migration Testing

1. Generate migration: `npm run db:generate`
2. Review generated SQL in `drizzle/` folder
3. Apply migration: `npm run db:push`
4. Verify table creation in database
5. Test default values creation

## Troubleshooting

### Issue: Theme not applying

**Solution:** Ensure `next-themes` is properly configured in root layout and ThemeProvider wraps the application.

### Issue: Preferences not saving

**Solution:** Check that the `user_preferences` table exists and the migration has been applied.

### Issue: Sessions not showing

**Solution:** Verify that NextAuth.js is using database sessions (not JWT) and the `sessions` table is populated.

### Issue: API routes returning 401

**Solution:** Ensure user is authenticated and session is valid. Check that `auth()` is resolving correctly.

## Conclusion

The user settings implementation provides a comprehensive, secure, and user-friendly interface for managing personal account preferences. The modular design makes it easy to extend with additional settings pages and preferences in the future.
