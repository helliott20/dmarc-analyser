# Help Center - Quick Reference Card

## 🚀 Quick Start

### For End Users

**Access Help**:
- Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) anywhere
- Click the floating help button (bottom-right corner)
- Click "Help" in the sidebar
- Visit `/help` directly

**Search Help**:
1. Open command palette (`Cmd+K`)
2. Type your question or topic
3. See instant results
4. Click to navigate

### For Developers

**Add Contextual Help to a Page**:
```tsx
import { ContextHelp } from '@/components/help/context-help';

<h1 className="flex items-center gap-2">
  Page Title
  <ContextHelp href="/help/article-name" />
</h1>
```

**Add Help to a Form Field**:
```tsx
<Label className="flex items-center gap-2">
  Field Name
  <ContextHelp
    title="Field explanation"
    description="What this field does"
    size="sm"
  />
</Label>
```

## 📦 Components Reference

### ContextHelp
**Import**: `import { ContextHelp } from '@/components/help/context-help'`

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `article` | `string` | - | Article ID to link to |
| `title` | `string` | "Learn more" | Tooltip title |
| `description` | `string` | - | Tooltip description |
| `href` | `string` | `/help` | Custom help URL |
| `size` | `'sm' \| 'md' \| 'lg'` | `'sm'` | Icon size |
| `className` | `string` | - | Additional CSS |

**Example**:
```tsx
<ContextHelp
  article="dmarc-basics"
  title="DMARC Overview"
  description="Learn about DMARC authentication"
  size="md"
/>
```

### ContextHelpCard
**Import**: `import { ContextHelpCard } from '@/components/help/context-help'`

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Card title |
| `description` | `string` | Yes | Card description |
| `href` | `string` | Yes | Help article URL |
| `className` | `string` | No | Additional CSS |

**Example**:
```tsx
<ContextHelpCard
  title="Getting Started"
  description="Learn how to set up your first domain"
  href="/help/getting-started"
/>
```

### HelpWidget
**Import**: `import { HelpWidget } from '@/components/help/help-widget'`

**Props**:
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Custom positioning |

**Example**:
```tsx
<HelpWidget className="bottom-8 right-8" />
```

**Note**: Already integrated in dashboard layout - no need to add manually.

## 📚 Content Management

### Add a New Article

**File**: `/src/lib/help-content.ts`

```typescript
// 1. Add to helpArticles array
{
  id: 'unique-article-id',
  title: 'Article Title',
  description: 'One-line description',
  category: 'dmarc-basics', // Choose category
  icon: BookOpen, // Lucide icon
  href: '/help/article-page',
  content: 'Searchable content text',
  keywords: ['keyword1', 'keyword2', 'searchable', 'terms'],
  relatedArticles: ['related-id-1', 'related-id-2'],
}

// 2. Create page at:
// /src/app/(dashboard)/help/article-page/page.tsx
```

### Add a New FAQ

```typescript
// Add to faqs array in /src/lib/help-content.ts
{
  id: 'unique-faq-id',
  question: 'Your question here?',
  answer: 'Detailed answer with helpful information...',
  category: 'troubleshooting', // Choose category
  keywords: ['search', 'terms', 'relevant', 'words'],
}
```

### Add a New Category

```typescript
// 1. Update type
type HelpCategory =
  | 'existing-categories'
  | 'new-category-id'; // Add here

// 2. Add to helpCategories array
{
  id: 'new-category-id',
  name: 'Display Name',
  description: 'Category description',
  icon: IconComponent,
}
```

## 🎨 Common Patterns

### Page Header with Help
```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <h1 className="text-2xl font-bold">Settings</h1>
    <ContextHelp href="/help/settings" />
  </div>
  <p className="text-muted-foreground">Configure your preferences</p>
</div>
```

### Form Field with Help
```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Label htmlFor="field">Field Label</Label>
    <ContextHelp
      title="Field help"
      description="What this field controls"
      size="sm"
    />
  </div>
  <Input id="field" />
</div>
```

### Card Header with Help
```tsx
<CardHeader>
  <CardTitle className="flex items-center gap-2">
    Section Title
    <ContextHelp href="/help/section" />
  </CardTitle>
</CardHeader>
```

### Table Column with Help
```tsx
<TableHead>
  <div className="flex items-center gap-2">
    Column Name
    <ContextHelp
      title="Column explanation"
      size="sm"
    />
  </div>
</TableHead>
```

### Alert with Help Link
```tsx
<Alert>
  <AlertTitle className="flex items-center gap-2">
    Issue Detected
    <ContextHelp href="/help/troubleshooting#issue" />
  </AlertTitle>
  <AlertDescription>
    Description of the issue...
  </AlertDescription>
</Alert>
```

## 🔍 Search Features

### Search Weighting
- **Exact title match**: 100 points
- **Description match**: 50 points (articles), 30 (FAQs)
- **Keyword match**: 30 points (articles), 20 (FAQs)
- **Term match**: 10 points (articles), 5 (FAQs)

### Search Tips
- Minimum 2 characters
- Case-insensitive
- Multi-word searches supported
- No special characters needed
- Instant results (no debounce)

### Optimize for Search
- Use clear, descriptive titles
- Add comprehensive keywords
- Include common misspellings
- Add synonyms and related terms
- Think about user language

## 🎯 Categories

| Category | ID | Usage |
|----------|----|----|
| Getting Started | `getting-started` | Onboarding, setup, first steps |
| DMARC Basics | `dmarc-basics` | Core concepts, fundamentals |
| Features | `features` | App features, how-to guides |
| Reports | `reports` | Understanding data, analytics |
| Configuration | `configuration` | Settings, DNS, policies |
| Troubleshooting | `troubleshooting` | Problems, errors, fixes |

## 🔗 URL Patterns

| URL | Description |
|-----|-------------|
| `/help` | Main help center |
| `/help/article-name` | Specific article |
| `/help#faq-id` | Jump to FAQ |
| `/help/article#section` | Article section |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` (Mac) | Open command palette |
| `Ctrl+K` (Windows) | Open command palette |
| `Esc` | Close dialog/sheet |
| `Tab` | Navigate items |
| `Enter` | Select item |
| `/` | Focus search (help page) |

## 🎨 Icon Sizes

| Size | Pixels | Usage |
|------|--------|-------|
| `sm` | 14px | Inline with labels, form fields |
| `md` | 16px | Section headers, default |
| `lg` | 20px | Page headers, prominent |

## 📱 Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| Mobile (<640px) | Full-width sheet, stacked cards |
| Tablet (640-1024px) | Partial sheet, 2-col grid |
| Desktop (>1024px) | Optimal sheet, 2-3 col grid |

## ♿ Accessibility

- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ ARIA labels
- ✅ Focus indicators
- ✅ WCAG AA contrast
- ✅ Semantic HTML

## 🚨 Common Issues

### Help Widget Not Appearing
**Solution**: Check it's in dashboard layout:
```tsx
<main>
  {children}
  <HelpWidget />
</main>
```

### Search Not Working
**Solution**: Verify import:
```tsx
import { searchHelpContent } from '@/lib/help-content';
```

### Tooltip Not Showing
**Solution**: ContextHelp includes its own TooltipProvider, no setup needed.

### Deep Links Not Working
**Solution**: Use correct format:
```tsx
href="/help#faq-article-id"
// Note: faq- prefix required
```

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| `HELP_CENTER_GUIDE.md` | Complete documentation |
| `HELP_CENTER_EXAMPLES.md` | Code examples |
| `HELP_CENTER_SUMMARY.md` | Implementation overview |
| `HELP_CENTER_ARCHITECTURE.md` | System architecture |
| `HELP_CENTER_QUICK_REFERENCE.md` | This file |

## 🔧 Useful Functions

### Search Help Content
```typescript
import { searchHelpContent } from '@/lib/help-content';

const results = searchHelpContent('dmarc');
// Returns: { articles: HelpArticle[], faqs: FAQ[] }
```

### Get Articles by Category
```typescript
import { getArticlesByCategory } from '@/lib/help-content';

const articles = getArticlesByCategory('dmarc-basics');
```

### Get Article by ID
```typescript
import { getArticleById } from '@/lib/help-content';

const article = getArticleById('getting-started');
```

### Get Related Articles
```typescript
import { getRelatedArticles } from '@/lib/help-content';

const related = getRelatedArticles('dmarc-basics');
```

## 💡 Best Practices

1. **Add help icons sparingly** - Only for complex features
2. **Write clear descriptions** - Concise, actionable
3. **Use appropriate sizes** - `sm` for inline, `md` for headers
4. **Test keyboard nav** - Ensure all help is accessible
5. **Update keywords** - Keep search terms current
6. **Link related content** - Help users discover more
7. **Monitor usage** - Track what users search for
8. **Keep content fresh** - Update based on feedback

## 🎓 Learning Path

**For Users**:
1. Try `Cmd+K` search
2. Explore floating help widget
3. Browse help center categories
4. Use contextual help icons

**For Developers**:
1. Read `HELP_CENTER_GUIDE.md`
2. Review `HELP_CENTER_EXAMPLES.md`
3. Add ContextHelp to one page
4. Create a new help article
5. Test search functionality

## 📞 Support

**Questions about implementation?**
- Check `HELP_CENTER_GUIDE.md` for details
- Review `HELP_CENTER_EXAMPLES.md` for patterns
- See `HELP_CENTER_ARCHITECTURE.md` for system design

**Need to extend functionality?**
- All components are in `/src/components/help/`
- Content is in `/src/lib/help-content.ts`
- Pages are in `/src/app/(dashboard)/help/`

---

**Version**: 1.0
**Last Updated**: 2025-12-10
**Status**: Production Ready
