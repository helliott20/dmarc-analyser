# Onboarding Wizard Implementation

A comprehensive multi-step onboarding wizard to guide new users through the initial setup of the DMARC Analyzer application.

## Overview

The onboarding wizard provides a smooth first-time user experience with:
- 6-step guided setup process
- Progress tracking and visual indicators
- Optional steps for flexible onboarding
- Automatic redirect for new users after authentication
- Mobile-responsive design

## Architecture

### File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── onboarding/
│   │       └── page.tsx                    # Main onboarding page
│   └── api/
│       └── user/
│           └── onboarding/
│               └── route.ts                # API endpoints for onboarding status
└── components/
    └── onboarding/
        ├── onboarding-wizard.tsx           # Main wizard component
        └── steps/
            ├── welcome-step.tsx            # Step 1: Welcome & intro
            ├── create-org-step.tsx         # Step 2: Create organization
            ├── add-domain-step.tsx         # Step 3: Add domain
            ├── verify-domain-step.tsx      # Step 4: Verify domain
            ├── connect-gmail-step.tsx      # Step 5: Connect Gmail
            └── complete-step.tsx           # Step 6: Completion & next steps
```

## Components

### 1. Main Onboarding Page (`/onboarding/page.tsx`)

**Location:** `/src/app/(dashboard)/onboarding/page.tsx`

**Features:**
- Checks if user needs onboarding on mount
- Redirects existing users to `/orgs` if they already have an organization
- Handles wizard completion and skip functionality
- Shows loading state during initialization

**Usage:**
```typescript
// Users are automatically redirected here after first sign-in
// Can be manually accessed at /onboarding
```

### 2. Onboarding Wizard Component

**Location:** `/src/components/onboarding/onboarding-wizard.tsx`

**Features:**
- Multi-step wizard with 6 steps
- Progress bar and step indicators
- Forward/backward navigation
- Skip functionality for optional steps
- Data persistence across steps using `stepData` state

**Step Configuration:**
```typescript
const steps = [
  { name: 'Welcome', component: WelcomeStep, skippable: false },
  { name: 'Create Organization', component: CreateOrgStep, skippable: false },
  { name: 'Add Domain', component: AddDomainStep, skippable: true },
  { name: 'Verify Domain', component: VerifyDomainStep, skippable: true },
  { name: 'Connect Gmail', component: ConnectGmailStep, skippable: true },
  { name: 'Complete', component: CompleteStep, skippable: false },
];
```

**Props:**
- `onComplete: () => void` - Callback when wizard is completed
- `onSkip: () => void` - Callback when user skips entire wizard

### 3. Individual Step Components

Each step component receives the following props:
```typescript
interface StepProps {
  onNext: (data?: Partial<StepData>) => void;  // Proceed to next step
  onBack: () => void;                            // Go back to previous step
  onSkip: () => void;                            // Skip current step
  stepData: StepData;                            // Data from previous steps
  isFirstStep: boolean;                          // True if first step
  isLastStep: boolean;                           // True if last step
  canSkip: boolean;                              // True if step is skippable
}
```

#### Step 1: Welcome Step
- Introduces DMARC Analyzer features
- Explains what will happen during onboarding
- Highlights key benefits (authentication, analytics, alerts, security)
- Non-skippable

#### Step 2: Create Organization Step
- Form to create first organization
- Auto-generates URL slug from organization name
- Validates organization name and slug
- Creates organization via API
- Stores organization ID and slug in step data
- Non-skippable

#### Step 3: Add Domain Step
- Form to add first domain to monitor
- Domain validation with helpful examples
- Optional display name
- Can be skipped (domains can be added later)
- Stores domain ID and domain name in step data

#### Step 4: Verify Domain Step
- Shows DNS verification instructions
- Displays TXT record details with copy-to-clipboard
- "Verify Now" or "Verify Later" options
- Calls verification API endpoint
- Can be skipped (verification can be done later)

#### Step 5: Connect Gmail Step
- Explains benefits of Gmail integration
- Shows privacy notes about email access
- Provides DMARC RUA configuration instructions
- Initiates OAuth flow when user clicks "Connect"
- Can be skipped (Gmail can be connected later)

#### Step 6: Complete Step
- Shows summary of completed setup
- Displays next steps and recommendations
- Links to relevant sections (domains, settings, documentation)
- Provides "Go to Dashboard" button

## API Endpoints

### GET `/api/user/onboarding`

**Purpose:** Check if user needs onboarding

**Response:**
```json
{
  "needsOnboarding": true,
  "hasOrganizations": false,
  "organizationCount": 0
}
```

**Logic:**
- Returns `needsOnboarding: true` if user has no organizations
- Returns `needsOnboarding: false` if user has at least one organization

### POST `/api/user/onboarding`

**Purpose:** Mark onboarding as complete or save progress

**Request Body:**
```json
{
  "completed": true,
  "progress": {
    "currentStep": 3,
    "completedSteps": [0, 1, 2]
  }
}
```

**Response:**
```json
{
  "success": true,
  "completed": true
}
```

## Authentication Integration

### Automatic Redirect After Sign-In

The authentication callback in `/src/lib/auth.ts` has been updated to check if new users need onboarding:

```typescript
async redirect({ url, baseUrl }) {
  if (url === baseUrl || url === `${baseUrl}/`) {
    // Check if user has any organizations
    const memberships = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, session.user.id))
      .limit(1);

    // If no organizations, redirect to onboarding
    if (memberships.length === 0) {
      return `${baseUrl}/onboarding`;
    }

    return `${baseUrl}/orgs`;
  }
  // ... other redirect logic
}
```

**Flow:**
1. User signs in with Google OAuth
2. Auth callback checks if user has any organizations
3. New users (no orgs) → Redirect to `/onboarding`
4. Existing users (has orgs) → Redirect to `/orgs`

## User Experience Flow

### New User Journey
1. User signs in for the first time
2. Automatically redirected to `/onboarding`
3. Sees welcome screen with product overview
4. Creates first organization (required)
5. Optionally adds first domain
6. Optionally verifies domain ownership
7. Optionally connects Gmail for auto-import
8. Sees completion screen with next steps
9. Redirected to organization dashboard

### Returning to Onboarding
Users who skip onboarding can return later:
- The onboarding page checks if they already have an org
- If they do, they're redirected to `/orgs`
- This prevents duplicate organization creation

## Step Data Management

The wizard maintains state across steps using the `stepData` object:

```typescript
interface StepData {
  organizationId?: string;      // Created in Step 2
  organizationSlug?: string;    // Created in Step 2
  domainId?: string;            // Created in Step 3
  domain?: string;              // Created in Step 3
  gmailConnected?: boolean;     // Set in Step 5
}
```

Each step can:
- Read data from previous steps via `stepData` prop
- Pass new data to next steps via `onNext(data)` callback

Example:
```typescript
// Step 2: Create Organization
onNext({
  organizationId: org.id,
  organizationSlug: org.slug,
});

// Step 3: Add Domain (can now access organization info)
const response = await fetch(`/api/orgs/${stepData.organizationSlug}/domains`, {
  method: 'POST',
  body: JSON.stringify({ domain }),
});
```

## UI Components Used

The wizard uses shadcn/ui components:
- `Card` - Container for step content
- `Button` - Navigation and actions
- `Input` - Form inputs
- `Label` - Form labels
- `Progress` - Progress bar
- `Badge` - Status indicators
- `Separator` - Visual dividers

All components are styled with Tailwind CSS and follow the app's design system.

## Customization Options

### Adding New Steps

1. Create new step component in `/src/components/onboarding/steps/`:
```typescript
export function MyCustomStep({ onNext, stepData }: StepProps) {
  return (
    <div>
      {/* Step content */}
      <Button onClick={() => onNext({ customData: 'value' })}>
        Continue
      </Button>
    </div>
  );
}
```

2. Add to wizard steps array:
```typescript
import { MyCustomStep } from './steps/my-custom-step';

const steps = [
  // ... existing steps
  { name: 'My Custom Step', component: MyCustomStep, skippable: true },
];
```

### Modifying Step Order

Simply reorder the `steps` array in `onboarding-wizard.tsx`.

### Changing Skip Behavior

Update the `skippable` property for each step:
```typescript
{ name: 'Add Domain', component: AddDomainStep, skippable: false }, // Now required
```

## Testing

### Manual Testing Checklist

- [ ] New user flow: Create account → Auto-redirect to onboarding
- [ ] Complete full wizard with all steps
- [ ] Skip optional steps and verify they can be done later
- [ ] Go back to previous steps and verify data persistence
- [ ] Close browser during onboarding and return
- [ ] Existing user: Verify they're redirected to `/orgs` not `/onboarding`
- [ ] Organization creation with various names and slugs
- [ ] Domain validation with valid/invalid domains
- [ ] DNS verification flow
- [ ] Gmail OAuth connection flow
- [ ] Mobile responsiveness

### Testing Onboarding as Existing User

To test the onboarding flow as an existing user:
1. Delete all organizations for your test user from the database
2. Visit `/onboarding` or sign in again
3. You'll see the onboarding wizard

## Future Enhancements

Potential improvements for future iterations:

1. **Progress Persistence**
   - Save onboarding progress to database
   - Allow users to resume from where they left off
   - Track which steps were completed

2. **Onboarding Analytics**
   - Track completion rates per step
   - Identify where users drop off
   - A/B test different onboarding flows

3. **Interactive Tutorials**
   - Add tooltips and guided tours
   - Interactive product demos
   - Video tutorials

4. **Conditional Steps**
   - Show different steps based on user type
   - Skip steps if prerequisites are met
   - Dynamic step ordering

5. **Multi-language Support**
   - Internationalize all step content
   - Locale-specific examples and instructions

6. **Onboarding Dashboard**
   - Admin view of onboarding completion rates
   - User progress tracking
   - Intervention for stuck users

## Troubleshooting

### User Stuck in Onboarding Loop
- Check if organizations are being created correctly in the database
- Verify `orgMembers` table has the correct user-org relationship
- Clear browser cache and try again

### Gmail Connection Fails
- Verify OAuth credentials in `.env`
- Check redirect URL is whitelisted in Google Console
- Ensure scopes include Gmail read access

### Domain Verification Fails
- Check DNS propagation (can take 5-60 minutes)
- Verify TXT record is added correctly
- Use DNS lookup tools to confirm record exists

## Related Files

- `/src/app/(dashboard)/orgs/page.tsx` - Organization listing
- `/src/app/(dashboard)/orgs/[slug]/domains/new/page.tsx` - Domain creation
- `/src/app/(dashboard)/orgs/[slug]/settings/gmail/page.tsx` - Gmail settings
- `/src/lib/auth.ts` - Authentication and redirect logic
- `/src/db/schema.ts` - Database schema

## Support

For questions or issues with the onboarding implementation:
1. Check this documentation
2. Review the inline code comments
3. Test with browser DevTools console open
4. Check API endpoint responses in Network tab
