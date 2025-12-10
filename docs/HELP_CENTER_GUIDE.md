# Help Center Integration Guide

This guide explains the comprehensive help center system integrated into the DMARC Analyzer application.

## Overview

The help center provides multiple access points for users to find assistance:

1. **Global Help Search (Cmd+K)** - Search help articles from anywhere in the app
2. **Contextual Help Tooltips** - Help icons next to complex features
3. **Enhanced Help Page** - Improved search with categories and FAQs
4. **Floating Help Widget** - Quick access sidebar for common questions

## Features

### 1. Global Help Search (Command Palette)

**Location**: Available anywhere in the dashboard via `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux)

**File**: `/src/components/dashboard/command-menu.tsx`

The existing command menu now includes instant help search:
- Search help articles and FAQs alongside domains, reports, and IPs
- Real-time search results as you type
- Grouped results: Help Articles, Common Questions, Domains, Sources, Reports
- Click any result to navigate directly to the help article or FAQ

**Usage**:
```tsx
// Already integrated in dashboard layout
<CommandMenu />
```

### 2. Contextual Help Tooltips

**Component**: `ContextHelp` and `ContextHelpCard`

**File**: `/src/components/help/context-help.tsx`

Add inline help icons next to any feature or heading:

**Basic Usage**:
```tsx
import { ContextHelp } from '@/components/help/context-help';

// Simple help icon with tooltip
<div className="flex items-center gap-2">
  <h1>Alert Settings</h1>
  <ContextHelp
    article="alerts"
    title="Learn about alerts"
    description="Learn how to configure alert rules and notification preferences"
    href="/help/alerts"
  />
</div>
```

**Props**:
- `article` (optional): Article ID to link to specific help section
- `title` (optional): Tooltip title (default: "Learn more")
- `description` (optional): Additional tooltip text
- `href` (optional): Custom help URL (defaults to `/help` or `/help#article`)
- `size` (optional): Icon size - 'sm' | 'md' | 'lg' (default: 'sm')
- `className` (optional): Custom CSS classes

**Help Card Variant**:
```tsx
import { ContextHelpCard } from '@/components/help/context-help';

<ContextHelpCard
  title="Getting Started with DMARC"
  description="Learn the basics of setting up your first domain"
  href="/help/getting-started"
/>
```

### 3. Enhanced Help Page

**Location**: `/help`

**File**: `/src/app/(dashboard)/help/page.tsx`

Features:
- **Instant Search**: Real-time filtering of articles and FAQs
- **Category Filters**: Browse by topic (Getting Started, DMARC Basics, Features, etc.)
- **Expandable FAQs**: Accordion-style FAQ sections with deep linking
- **Article Cards**: Organized cards with icons and descriptions
- **Result Counts**: Shows number of matching results
- **Related Articles**: Suggested articles at the bottom of each page

**Category Badges**: Each category shows the number of available articles

### 4. Floating Help Widget

**Component**: `HelpWidget`

**File**: `/src/components/help/help-widget.tsx`

A floating button in the bottom-right corner that opens a help sidebar:

Features:
- **Persistent Access**: Always visible on dashboard pages
- **Quick Search**: Search help articles without leaving the page
- **Popular Articles**: Shows top 5 most relevant articles
- **FAQ Access**: Quick links to common questions
- **Smooth Animations**: Scale on hover, smooth sheet transitions

**Integration**:
```tsx
import { HelpWidget } from '@/components/help/help-widget';

// Already integrated in dashboard layout
<HelpWidget />
```

To customize positioning:
```tsx
<HelpWidget className="bottom-8 right-8" />
```

## Help Content Management

### Adding Help Articles

**File**: `/src/lib/help-content.ts`

```typescript
const newArticle: HelpArticle = {
  id: 'unique-id',
  title: 'Article Title',
  description: 'Brief description',
  category: 'dmarc-basics', // or other category
  icon: IconComponent, // Lucide icon
  href: '/help/article-page',
  content: 'Full article content for search',
  keywords: ['keyword1', 'keyword2', 'search terms'],
  relatedArticles: ['other-article-id'],
};

// Add to helpArticles array
export const helpArticles: HelpArticle[] = [
  // ...existing articles,
  newArticle,
];
```

### Adding FAQs

```typescript
const newFaq: FAQ = {
  id: 'unique-id',
  question: 'Your question here?',
  answer: 'Detailed answer with helpful information...',
  category: 'troubleshooting',
  keywords: ['search', 'terms'],
};

// Add to faqs array
export const faqs: FAQ[] = [
  // ...existing faqs,
  newFaq,
];
```

### Available Categories

```typescript
type HelpCategory =
  | 'getting-started'
  | 'dmarc-basics'
  | 'features'
  | 'troubleshooting'
  | 'configuration'
  | 'reports';
```

## Search Functionality

The help search uses a weighted scoring system:

**Scoring Priority**:
1. Exact title match: 100 points
2. Description match: 50 points (articles) / 30 points (FAQs)
3. Keyword match: 30 points (articles) / 20 points (FAQs)
4. Content match: 10 points (articles) / 5 points (FAQs)

**Search Features**:
- Multi-term search (splits on spaces)
- Case-insensitive
- Minimum 2 characters required
- Real-time results (no debounce needed, runs client-side)

## Best Practices

### When to Add Contextual Help

Add `<ContextHelp>` components:
- Next to complex feature headings
- Near configuration forms with multiple options
- Beside technical terms or jargon
- In settings pages with advanced options
- When introducing new features

### Example Placements

```tsx
// Page heading
<div className="flex items-center gap-2">
  <h1 className="text-2xl font-bold">DNS Records</h1>
  <ContextHelp href="/help/dns-records" />
</div>

// Form section
<div className="space-y-4">
  <div className="flex items-center gap-2">
    <Label>DMARC Policy</Label>
    <ContextHelp
      title="DMARC Policy Options"
      description="Learn about none, quarantine, and reject policies"
      href="/help/policies"
      size="sm"
    />
  </div>
  <Select>...</Select>
</div>

// Card title
<CardHeader>
  <CardTitle className="flex items-center gap-2">
    Forensic Reports
    <ContextHelp href="/help/forensic" />
  </CardTitle>
</CardHeader>
```

### Writing Help Content

**Articles**:
- Keep titles clear and action-oriented
- Write concise descriptions (1-2 sentences)
- Include comprehensive keywords for searchability
- Link related articles at the end
- Use consistent formatting

**FAQs**:
- Write questions from user perspective
- Answer directly and concisely
- Include troubleshooting steps when applicable
- Add relevant keywords for search

**Keywords**:
- Include common misspellings
- Add synonyms and related terms
- Think about how users search ("not working", "fix", "how to")
- Include acronyms and full names (e.g., "SPF", "Sender Policy Framework")

## Accessibility

All help components follow accessibility best practices:

- **Keyboard Navigation**: Full keyboard support in command palette and accordions
- **ARIA Labels**: Proper labels on all interactive elements
- **Focus Management**: Visible focus states and logical tab order
- **Screen Readers**: Descriptive text for icons and buttons
- **Color Contrast**: WCAG AA compliant contrast ratios

## Design System Consistency

The help center follows the existing design patterns:

**Colors**: Uses theme variables (primary, muted, accent)
**Typography**: Follows established heading hierarchy
**Spacing**: Uses consistent spacing values
**Icons**: Lucide icons matching the rest of the app
**Components**: shadcn/ui components (Card, Sheet, Accordion, etc.)

## Keyboard Shortcuts

- `Cmd+K` / `Ctrl+K`: Open command palette (includes help search)
- `Esc`: Close command palette or help widget
- `Tab`: Navigate through help results
- `Enter`: Select help article or FAQ

## Future Enhancements

Potential improvements:
- Analytics tracking for popular searches
- AI-powered help suggestions based on user context
- Video tutorials embedded in help articles
- Multi-language support
- Help article voting/feedback system
- Contact support integration

## Troubleshooting

### Help Widget Not Showing

Check that it's included in the dashboard layout:
```tsx
// In /src/app/(dashboard)/layout.tsx
<main className="flex-1 overflow-auto p-6">
  {children}
  <HelpWidget />
</main>
```

### Search Not Working

Verify help content is properly imported:
```tsx
import { searchHelpContent } from '@/lib/help-content';
```

### Tooltips Not Appearing

Ensure TooltipProvider is present (ContextHelp includes its own provider, but check for conflicts).

## Files Overview

```
src/
├── lib/
│   └── help-content.ts              # Help articles, FAQs, search logic
├── components/
│   ├── help/
│   │   ├── context-help.tsx         # Contextual help tooltips
│   │   ├── help-widget.tsx          # Floating help button/sidebar
│   │   └── help-sidebar.tsx         # Help page navigation sidebar
│   └── dashboard/
│       └── command-menu.tsx         # Enhanced with help search
└── app/
    └── (dashboard)/
        └── help/
            ├── page.tsx             # Main help center page
            ├── layout.tsx           # Help section layout
            └── [article]/page.tsx   # Individual help articles
```

## Summary

The integrated help center provides comprehensive, context-aware assistance throughout the application:

1. Users can quickly search help content via `Cmd+K` from anywhere
2. Contextual help icons guide users to relevant documentation
3. The enhanced help page offers powerful search and organization
4. The floating widget provides instant access to common questions

All components follow the app's design system and accessibility standards, creating a cohesive and user-friendly help experience.
