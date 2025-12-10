# Onboarding Wizard - Quick Start Guide

## For Developers

### Getting Started

The onboarding wizard is fully implemented and ready to use. No additional setup is required beyond having a working database.

### Key Files

```
/src/app/(dashboard)/onboarding/page.tsx          # Main page
/src/components/onboarding/onboarding-wizard.tsx  # Wizard component
/src/components/onboarding/steps/*.tsx            # Individual steps
/src/app/api/user/onboarding/route.ts            # API endpoints
```

### How It Works

1. **New users** sign in → Automatically redirected to `/onboarding`
2. **Existing users** sign in → Redirected to `/orgs` (skip onboarding)
3. Users can **skip** optional steps and return later
4. On completion → Redirected to organization dashboard

### Testing

```bash
# 1. Start the dev server
npm run dev

# 2. Sign in with a new Google account
# 3. You'll be automatically redirected to /onboarding

# To test as existing user:
# - Delete all organizations for test user from database
# - Sign in again or visit /onboarding
```

### Customizing Steps

Edit `/src/components/onboarding/onboarding-wizard.tsx`:

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

To add a step, create a new component and add it to the array.
To remove a step, simply remove it from the array.
To make a step required, set `skippable: false`.

## For End Users

### What is Onboarding?

The onboarding wizard helps you set up your DMARC Analyzer account in just a few minutes.

### Steps Overview

1. **Welcome** - Learn about DMARC Analyzer features
2. **Create Organization** - Set up your workspace
3. **Add Domain** (Optional) - Add your first domain to monitor
4. **Verify Domain** (Optional) - Prove you own the domain
5. **Connect Gmail** (Optional) - Auto-import DMARC reports
6. **Complete** - See next steps and start monitoring

### Tips

- You can skip optional steps and complete them later from your dashboard
- Your progress is saved as you go
- Need help? Each step has clear instructions and examples
- The whole process takes about 5 minutes

### What Happens After Onboarding?

After completing onboarding, you'll be taken to your organization dashboard where you can:
- View DMARC reports and analytics
- Add more domains to monitor
- Invite team members
- Configure alerts and notifications
- Set up integrations

### Accessing Your Dashboard

After onboarding, your dashboard is available at:
```
/orgs/[your-organization-slug]
```

## For Product Managers

### Success Metrics to Track

1. **Completion Rate**: % of users who complete onboarding
2. **Drop-off Points**: Which steps have highest abandonment
3. **Time to Complete**: Average time from start to finish
4. **Skip Rates**: Which optional steps are most skipped
5. **Return Rate**: % who come back to complete skipped steps

### Current Implementation

- ✅ 6-step guided wizard
- ✅ Progress tracking and indicators
- ✅ Skip functionality for optional steps
- ✅ Mobile responsive
- ✅ Auto-redirect for new users
- ✅ Clean, modern UI with shadcn/ui

### Future Enhancements

- [ ] Save progress to database (currently in-memory)
- [ ] Add onboarding analytics dashboard
- [ ] A/B test different step orders
- [ ] Add interactive product tours
- [ ] Multi-language support
- [ ] In-app help videos

## API Reference

### Check Onboarding Status

```
GET /api/user/onboarding
```

Response:
```json
{
  "needsOnboarding": true,
  "hasOrganizations": false,
  "organizationCount": 0
}
```

### Complete Onboarding

```
POST /api/user/onboarding
```

Request:
```json
{
  "completed": true,
  "progress": { "currentStep": 6 }
}
```

Response:
```json
{
  "success": true,
  "completed": true
}
```

## Common Questions

### Q: Can users access the app without completing onboarding?

A: Yes, users can skip optional steps or exit onboarding entirely. They can return later to complete skipped steps from their dashboard.

### Q: What if a user closes their browser during onboarding?

A: Currently, progress is stored in component state. If the user closes the browser, they'll restart from the beginning. Future enhancement: persist progress to database.

### Q: Can existing users access onboarding again?

A: Yes, they can visit `/onboarding`, but they'll be redirected to `/orgs` if they already have an organization.

### Q: How do I customize the steps for my use case?

A: Edit the `steps` array in `/src/components/onboarding/onboarding-wizard.tsx` to add, remove, or reorder steps. Each step is a separate component for easy customization.

### Q: Can I make all steps required?

A: Yes, set `skippable: false` for each step in the wizard configuration.

## Support

For implementation questions or issues:
1. Check `ONBOARDING_IMPLEMENTATION.md` for detailed documentation
2. Review inline code comments in the components
3. Test with browser DevTools console open
4. Check API responses in the Network tab
