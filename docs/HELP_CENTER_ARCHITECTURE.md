# Help Center Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DMARC Analyzer App                        │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Help Content Library                       │ │
│  │              (/src/lib/help-content.ts)                     │ │
│  │                                                             │ │
│  │  • 10 Help Articles                                         │ │
│  │  • 10 FAQs                                                  │ │
│  │  • 6 Categories                                             │ │
│  │  • searchHelpContent() function                             │ │
│  │  • Weighted scoring algorithm                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              │ imports                            │
│              ┌───────────────┼───────────────┐                   │
│              │               │               │                   │
│              ▼               ▼               ▼                   │
│  ┌─────────────────┐ ┌─────────────┐ ┌──────────────────┐      │
│  │  Command Menu   │ │ Help Widget │ │   Help Page      │      │
│  │  (Cmd+K Search) │ │  (Floating) │ │  (Main Center)   │      │
│  └─────────────────┘ └─────────────┘ └──────────────────┘      │
│          │                   │                   │               │
│          └───────────────────┴───────────────────┘               │
│                              │                                    │
│                              ▼                                    │
│                     ┌────────────────┐                           │
│                     │  Context Help  │                           │
│                     │   (Tooltips)   │                           │
│                     └────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. Help Content Library (Central Data Source)

```
/src/lib/help-content.ts
├── Data Structures
│   ├── HelpArticle (interface)
│   ├── FAQ (interface)
│   ├── HelpCategory (type)
│   └── HelpCategoryInfo (interface)
│
├── Content Arrays
│   ├── helpArticles[] (10 articles)
│   ├── faqs[] (10 questions)
│   └── helpCategories[] (6 categories)
│
└── Functions
    ├── searchHelpContent(query: string)
    ├── getArticlesByCategory(category)
    ├── getArticleById(id)
    ├── getRelatedArticles(articleId)
    └── getFaqsByCategory(category)
```

### 2. Command Menu Integration

```
/src/components/dashboard/command-menu.tsx
├── Existing Features
│   ├── Domain search
│   ├── Source search
│   ├── Report search
│   └── Quick actions
│
└── New Features (Added)
    ├── Help article search
    ├── FAQ search
    ├── Result grouping
    └── Navigation to help pages
```

**User Flow**:
```
User presses Cmd+K
    ↓
Command palette opens
    ↓
User types query (e.g., "spf")
    ↓
searchHelpContent() runs instantly
    ↓
Results grouped by type:
  • Help Articles
  • Common Questions
  • Domains
  • Sources
    ↓
User selects result
    ↓
Navigate to help article/FAQ
```

### 3. Help Widget (Floating Sidebar)

```
/src/components/help/help-widget.tsx
├── Trigger Button (floating, bottom-right)
├── Sheet Sidebar
│   ├── Search Input
│   ├── Quick Links
│   ├── Popular Articles (top 5)
│   └── Frequently Asked (top 5)
│
└── Features
    ├── Client-side search
    ├── Instant results
    ├── Smooth animations
    └── Keyboard accessible
```

**User Flow**:
```
User clicks help button (bottom-right)
    ↓
Sheet opens from right
    ↓
User can:
  • Search help articles
  • Browse popular articles
  • View common FAQs
  • Access full help center
    ↓
Click article/FAQ
    ↓
Navigate to help page
```

### 4. Enhanced Help Page

```
/src/app/(dashboard)/help/page.tsx
├── Header
│   └── Search Bar
│
├── Category Filters
│   ├── All Topics
│   ├── Getting Started (badge: count)
│   ├── DMARC Basics (badge: count)
│   ├── Features (badge: count)
│   ├── Reports (badge: count)
│   ├── Configuration (badge: count)
│   └── Troubleshooting (badge: count)
│
├── Article Grid (responsive)
│   └── Article Cards
│       ├── Icon
│       ├── Title
│       └── Description
│
└── FAQ Accordion
    └── FAQ Items
        ├── Question (trigger)
        └── Answer (content)
```

**User Flow**:
```
User navigates to /help
    ↓
See all categories and articles
    ↓
Options:
  1. Search in search bar
     ↓
     Instant filtering
     ↓
     See matching articles & FAQs

  2. Click category filter
     ↓
     View articles in that category
     ↓
     Scroll to relevant FAQs

  3. Click article card
     ↓
     Navigate to full article

  4. Click FAQ
     ↓
     Expand to see answer
```

### 5. Context Help Components

```
/src/components/help/context-help.tsx
├── ContextHelp (icon tooltip)
│   ├── Props
│   │   ├── article (optional)
│   │   ├── title (optional)
│   │   ├── description (optional)
│   │   ├── href (optional)
│   │   ├── size (optional)
│   │   └── className (optional)
│   │
│   └── Renders
│       ├── Help icon (HelpCircle)
│       ├── Tooltip on hover
│       └── Link to help article
│
└── ContextHelpCard (card variant)
    ├── Props
    │   ├── title (required)
    │   ├── description (required)
    │   ├── href (required)
    │   └── className (optional)
    │
    └── Renders
        ├── Card with help icon
        ├── Title and description
        └── Clickable to help article
```

## Data Flow

### Search Flow

```
User Input
    ↓
searchHelpContent(query)
    ↓
┌─────────────────────────────────┐
│   Scoring Algorithm              │
│                                  │
│   For each article:              │
│   • Check title match (100pts)   │
│   • Check description (50pts)    │
│   • Check keywords (30pts)       │
│   • Check terms (10pts)          │
│                                  │
│   For each FAQ:                  │
│   • Check question (100pts)      │
│   • Check answer (30pts)         │
│   • Check keywords (20pts)       │
│   • Check terms (5pts)           │
└─────────────────────────────────┘
    ↓
Sort by score (highest first)
    ↓
Return { articles: [], faqs: [] }
    ↓
Display in UI
```

### Navigation Flow

```
User Interaction
    ↓
Click article/FAQ link
    ↓
Next.js Router
    ↓
Navigate to:
  • /help (main page)
  • /help/[article] (article page)
  • /help#faq-[id] (FAQ anchor)
    ↓
Page Loads
    ↓
Show breadcrumbs
Show article content
Show related articles
```

## Integration Points

### Dashboard Layout Integration

```
/src/app/(dashboard)/layout.tsx
├── SidebarProvider
│   ├── AppSidebar
│   │   └── Help link (footer)
│   │
│   └── SidebarInset
│       ├── Header
│       │   └── CommandMenu (Cmd+K)
│       │
│       └── Main Content
│           ├── {children}
│           └── HelpWidget (floating) ← Added here
└── OrgThemeProvider
```

### Page-Level Integration Example

```
Alert Settings Page
├── Page Header
│   ├── Title: "Alert Settings"
│   └── ContextHelp ← Added here
│       └── Links to /help/alerts
│
├── Form Fields
│   ├── Field Label: "New Source Alert"
│   ├── ContextHelp ← Can add here
│   └── Switch
│
└── Settings Cards
    ├── Card Title: "Alert Rules"
    └── ContextHelp ← Can add here
```

## State Management

### Command Menu State
```
useState (local)
├── open: boolean
├── query: string
├── results: SearchResult[]
└── loading: boolean

useMemo
└── helpResults ← Computed from query
```

### Help Widget State
```
useState (local)
├── open: boolean (sheet)
└── searchQuery: string

useMemo
├── searchResults ← Computed from searchQuery
├── popularArticles ← Static slice
└── popularFaqs ← Static slice
```

### Help Page State
```
useState (local)
├── searchQuery: string
└── selectedCategory: HelpCategory | 'all'

useMemo
├── searchResults ← Computed from query
├── filteredArticles ← By category/search
└── filteredFaqs ← By category/search
```

## Performance Characteristics

### Search Performance
- **Client-side**: No API calls, instant results
- **Memoized**: Results cached until query changes
- **Lightweight**: Simple string matching, no heavy computation
- **Scalable**: Works efficiently with 10-100 articles

### Bundle Size Impact
- **Help content**: ~15-20KB (text content)
- **Components**: ~8-12KB (TSX components)
- **Total addition**: ~25-30KB gzipped
- **Tree-shakeable**: Import only what you need

### Runtime Performance
- **Search**: <1ms for typical queries
- **Rendering**: Optimized with React.useMemo
- **No blocking**: All operations are synchronous, no async delays
- **Memory**: Minimal overhead, content loaded once

## Accessibility Tree

```
Help Center Components
├── CommandDialog (role="dialog")
│   ├── CommandInput (role="combobox")
│   └── CommandList (role="listbox")
│       └── CommandItem (role="option")
│
├── Sheet (role="dialog")
│   ├── SheetTitle (aria-labelledby)
│   ├── Input (role="searchbox")
│   └── ScrollArea (role="region")
│
├── Tooltip
│   ├── TooltipTrigger (aria-describedby)
│   └── TooltipContent (role="tooltip")
│
└── Accordion
    ├── AccordionItem (data-state)
    ├── AccordionTrigger (aria-expanded)
    └── AccordionContent (role="region")
```

## Error Handling

```
Graceful Degradation
├── No results found
│   └── Display "No results" message
│
├── Missing article
│   └── Fallback to help home
│
├── Invalid category
│   └── Default to "all"
│
└── Search errors
    └── Show empty results, no crash
```

## Theme Support

```
Design Tokens Used
├── Colors
│   ├── --primary
│   ├── --muted-foreground
│   ├── --border
│   ├── --accent
│   └── --card
│
├── Spacing
│   ├── theme spacing scale
│   └── Consistent gaps
│
└── Typography
    ├── Font families (Geist)
    ├── Heading scales (h1-h6)
    └── Body text sizes
```

## Responsive Design

```
Breakpoints
├── Mobile (< 640px)
│   ├── Full-width search
│   ├── Stacked cards
│   ├── Single column layout
│   └── Sheet takes full width
│
├── Tablet (640px - 1024px)
│   ├── 2-column article grid
│   ├── Category scroll
│   └── Sheet partial width
│
└── Desktop (> 1024px)
    ├── 2-3 column grids
    ├── Full category bar
    └── Optimal sheet width
```

## Future Extension Points

```
Extensibility
├── Add new categories
│   └── Update HelpCategory type
│
├── Add new articles
│   └── Push to helpArticles array
│
├── Add analytics
│   └── Wrap navigation with tracking
│
├── Add voting
│   └── Add state management
│
└── Add AI suggestions
    └── Integrate with API
```

This architecture provides a solid foundation for a comprehensive help system that can grow with the application's needs.
