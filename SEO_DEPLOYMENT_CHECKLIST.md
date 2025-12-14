# SEO Deployment Checklist

## Pre-Deployment Review

### Code Changes
- [x] Meta tags implemented in root layout
- [x] Homepage metadata configured
- [x] Pricing page metadata configured
- [x] Open Graph tags added
- [x] Twitter Card tags added
- [x] Structured data (JSON-LD) implemented
- [x] Semantic HTML improved
- [x] Heading hierarchy optimized
- [x] ARIA labels added
- [x] Sitemap generation configured
- [x] Robots.txt created

### Documentation
- [x] SEO_AUDIT_REPORT.md (900+ lines)
- [x] SEO_IMPLEMENTATION_GUIDE.md (400+ lines)
- [x] SEO_CODE_EXAMPLES.md (500+ lines)
- [x] SEO_IMPLEMENTATION_SUMMARY.md (400+ lines)
- [x] SEO_QUICK_REFERENCE.md (200+ lines)
- [x] SEO_DEPLOYMENT_CHECKLIST.md (this file)

---

## Pre-Launch Tasks (Week 1)

### Design Assets
- [ ] Create homepage OG image (1200x630px PNG/JPG)
  - [ ] Include DMARC Analyser branding
  - [ ] Add main value proposition
  - [ ] Keep file < 200KB
  - [ ] Place at: /public/og-image-home.png

- [ ] Create pricing page OG image (1200x630px PNG/JPG)
  - [ ] Show pricing tiers
  - [ ] Highlight £10/month
  - [ ] Add "14-day Free Trial" badge
  - [ ] Keep file < 200KB
  - [ ] Place at: /public/og-image-pricing.png

### Favicon Generation
- [ ] Generate favicon.ico (256x256 base)
  - [ ] Use brand logo/icon
  - [ ] Place at: /public/favicon.ico

- [ ] Generate favicon-16x16.png
  - [ ] Place at: /public/favicon-16x16.png

- [ ] Generate favicon-32x32.png
  - [ ] Place at: /public/favicon-32x32.png

- [ ] Generate apple-touch-icon.png (180x180)
  - [ ] Place at: /public/apple-touch-icon.png

**Recommended Tool**: https://realfavicongenerator.net/

### Configuration
- [ ] Set environment variable: NEXT_PUBLIC_APP_URL
  ```bash
  NEXT_PUBLIC_APP_URL=https://dmarc-analyser.com
  ```

- [ ] Get Google Search Console verification code
  1. Visit: https://search.google.com/search-console
  2. Click "Add property"
  3. Enter: https://dmarc-analyser.com
  4. Choose "HTML tag" method
  5. Copy verification code

- [ ] Set environment variable: GOOGLE_SITE_VERIFICATION
  ```bash
  GOOGLE_SITE_VERIFICATION=your-verification-code-here
  ```

---

## Testing Phase (Week 2)

### Local Testing
- [ ] Run `npm run build` - no errors
- [ ] Run `npm run dev` - server starts
- [ ] Open http://localhost:3000 in browser
- [ ] Right-click → Inspect → Elements tab
- [ ] Check `<head>` section contains:
  - [ ] `<title>` tag with correct text
  - [ ] `<meta name="description">` tag
  - [ ] `<meta property="og:title">` tag
  - [ ] `<meta property="og:description">` tag
  - [ ] `<meta property="og:image">` tag
  - [ ] `<meta name="twitter:card">` tag
  - [ ] `<script type="application/ld+json">` tags (at least 2)
  - [ ] Favicon `<link>` tags
  - [ ] Apple touch icon `<link>` tag

### Favicon Testing
- [ ] Favicon displays in browser tab
- [ ] Favicon displays in bookmark bar
- [ ] Favicon displays in history

### Homepage Testing
- [ ] Title renders correctly
- [ ] Description visible in DevTools
- [ ] OG image path correct
- [ ] All sections have aria-labels
- [ ] H1 heading present and unique

### Pricing Page Testing
- [ ] Title renders correctly
- [ ] Description visible in DevTools
- [ ] OG image path correct
- [ ] FAQ schema present
- [ ] Pricing schema present

### Schema Validation

#### Google Rich Results Test
- [ ] Go to: https://search.google.com/test/rich-results
- [ ] Input URL: https://localhost:3000 (or live after deploy)
- [ ] Verify schemas:
  - [ ] Organization schema: VALID
  - [ ] SoftwareApplication schema: VALID
  - [ ] Pricing schema (pricing page): VALID
  - [ ] FAQ schema (pricing page): VALID
- [ ] No errors or warnings

#### Schema.org Validator
- [ ] Go to: https://validator.schema.org/
- [ ] Input URL: https://dmarc-analyser.com (after deploy)
- [ ] Check for errors: NONE
- [ ] Check for warnings: NONE
- [ ] All required properties: PRESENT

### Open Graph Preview Testing

#### Facebook Debugger
- [ ] Go to: https://developers.facebook.com/tools/debug/
- [ ] Input URL: https://dmarc-analyser.com
- [ ] Verify:
  - [ ] Title displays correctly
  - [ ] Description displays correctly
  - [ ] Image displays correctly (1200x630)
  - [ ] No errors in debugger

#### LinkedIn Post Inspector
- [ ] Go to: https://www.linkedin.com/post-inspector/
- [ ] Input URL: https://dmarc-analyser.com
- [ ] Verify:
  - [ ] Title displays
  - [ ] Description displays
  - [ ] Image displays
  - [ ] Professional appearance

#### Twitter Card Validator
- [ ] Go to: https://cards-dev.twitter.com/validator
- [ ] Input URL: https://dmarc-analyser.com
- [ ] Verify:
  - [ ] Card type: summary_large_image
  - [ ] Title displays
  - [ ] Image displays
  - [ ] No warnings

### Social Media Sharing Test
- [ ] Tweet/post link to homepage
  - [ ] Image appears in preview
  - [ ] Title shows correctly
  - [ ] Description shows correctly

- [ ] Share link on LinkedIn
  - [ ] Image appears
  - [ ] Metadata displays correctly

- [ ] Share link on Facebook
  - [ ] Rich preview appears
  - [ ] All metadata displays

---

## Deployment (Week 2)

### Code Deployment
- [ ] All code committed to git
- [ ] All documentation files committed
- [ ] No uncommitted changes: `git status`
- [ ] Push to main branch: `git push origin main`

### Pre-Deployment Verification
- [ ] Build successful in CI/CD
- [ ] All tests pass (if any)
- [ ] No build warnings
- [ ] Environment variables configured in production

### Deploy to Production
- [ ] Trigger deployment (auto or manual)
- [ ] Monitor deployment logs
- [ ] Deployment completes successfully
- [ ] Website accessible at https://dmarc-analyser.com

### Post-Deployment Testing
- [ ] Website loads (check 200 status)
- [ ] Homepage accessible
- [ ] Pricing page accessible
- [ ] CSS/JS load correctly (no 404 errors)
- [ ] Images load correctly
- [ ] Open in incognito mode (fresh cache)

### Metadata Verification (Live)
- [ ] Open https://dmarc-analyser.com in browser
- [ ] Right-click → Inspect → Elements
- [ ] Verify metadata is live (see meta tags)
- [ ] Verify JSON-LD schema is present
- [ ] Open pricing page: https://dmarc-analyser.com/pricing
- [ ] Verify pricing page metadata
- [ ] Verify multiple schemas present

---

## Search Engine Integration (Week 2-3)

### Google Search Console

#### Setup
- [ ] Go to: https://search.google.com/search-console
- [ ] Click "Add property"
- [ ] Enter: https://dmarc-analyser.com
- [ ] Choose verification method: HTML tag
- [ ] Copy verification code
- [ ] Verify property

#### Configuration
- [ ] Go to Settings → Crawl
- [ ] Verify sitemap added automatically (may take time)
- [ ] Or manually add sitemap:
  1. Go to Sitemaps section
  2. Click "Add/test sitemap"
  3. Enter: https://dmarc-analyser.com/sitemap.xml
  4. Click "Submit"

#### Monitoring
- [ ] Monitor Coverage section for indexing status
- [ ] Check for any crawl errors
- [ ] Monitor Search Results for impressions
- [ ] Monitor Core Web Vitals

### Bing Webmaster Tools

#### Setup
- [ ] Go to: https://www.bing.com/webmasters/
- [ ] Sign in with Microsoft account
- [ ] Click "Add site"
- [ ] Enter: https://dmarc-analyser.com
- [ ] Verify site ownership

#### Configuration
- [ ] Go to Sitemaps
- [ ] Click "Submit sitemap"
- [ ] Enter: https://dmarc-analyser.com/sitemap.xml
- [ ] Click "Submit"

---

## Post-Launch Monitoring (Ongoing)

### Week 1 Monitoring
- [ ] Monitor Search Console Coverage (indexing)
- [ ] Check for crawl errors (should be 0)
- [ ] Monitor Core Web Vitals
- [ ] Check that homepage appears in search results
- [ ] Check that pricing page appears in search results

### Week 2-3 Monitoring
- [ ] Monitor search impressions in GSC
- [ ] Monitor click-through rate (should improve)
- [ ] Check keyword rankings via SEO tool
- [ ] Monitor organic traffic in Google Analytics
- [ ] Check for any new crawl errors

### Ongoing (Monthly)
- [ ] Review Search Console data
- [ ] Monitor keyword rankings (monthly)
- [ ] Analyze search queries
- [ ] Check featured snippet opportunities
- [ ] Monitor Core Web Vitals
- [ ] Plan content strategy

---

## Feature-Specific Validation

### Sitemap
- [ ] Accessible at: https://dmarc-analyser.com/sitemap.xml
- [ ] Contains valid XML
- [ ] Lists all pages: / , /pricing, /privacy, /terms, /login
- [ ] Proper URL encoding
- [ ] lastmod dates present

### Robots.txt
- [ ] Accessible at: https://dmarc-analyser.com/robots.txt
- [ ] Allows public pages
- [ ] Blocks /api/ and /dashboard/
- [ ] Sitemap reference present
- [ ] Syntax valid

### Open Graph Images
- [ ] Both images exist and are accessible
- [ ] og-image-home.png: 1200x630px
- [ ] og-image-pricing.png: 1200x630px
- [ ] No 404 errors when fetched
- [ ] File sizes reasonable (< 200KB each)

### Structured Data
- [ ] Organization schema validates
- [ ] SoftwareApplication schema validates
- [ ] Pricing schema validates
- [ ] FAQ schema validates
- [ ] No duplicate schemas
- [ ] All required properties present

### Mobile Optimization
- [ ] Responsive design maintained
- [ ] Metadata displays correctly on mobile
- [ ] Open Graph images not stretched
- [ ] Touch icons work on mobile devices
- [ ] Mobile view looks professional

---

## Success Criteria

### Technical
- [x] All meta tags implemented
- [x] All schemas configured
- [x] Sitemap generated
- [x] Robots.txt created
- [x] Code deploys without errors
- [x] Website loads without 404s

### Functionality
- [ ] Metadata displays in browser
- [ ] Schemas validate in Google Rich Results
- [ ] OG images appear in social previews
- [ ] Sitemap accessible and valid
- [ ] Robots.txt functional

### SEO Impact
- [ ] Homepage indexed in Google
- [ ] Pricing page indexed in Google
- [ ] Organic impressions in Search Console
- [ ] Featured snippets eligible (FAQ)
- [ ] Rich snippets appearing in SERP

---

## Support Resources

### Key Documentation
- SEO_IMPLEMENTATION_SUMMARY.md - Overview
- SEO_IMPLEMENTATION_GUIDE.md - Detailed steps
- SEO_CODE_EXAMPLES.md - Code reference
- SEO_AUDIT_REPORT.md - Full analysis
- SEO_QUICK_REFERENCE.md - Quick lookup

### Tools for Validation
- Google Rich Results: https://search.google.com/test/rich-results
- Schema Validator: https://validator.schema.org/
- Facebook OG Debugger: https://developers.facebook.com/tools/debug/
- Twitter Card Validator: https://cards-dev.twitter.com/validator

---

**Last Updated**: December 14, 2025
**Version**: 1.0
**Status**: Ready to Use
