# Help Center Integration Examples

Practical examples of how to use the help center components throughout the application.

## Example 1: Adding Contextual Help to a Page Header

```tsx
import { ContextHelp } from '@/components/help/context-help';

export default function DomainSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Page header with help icon */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Domain Settings
          </h1>
          <ContextHelp
            title="Learn about domain configuration"
            description="Understand how to configure DMARC policies and DNS records"
            href="/help/dns-records"
          />
        </div>
        <p className="text-muted-foreground">
          Configure DNS records and policies for your domain
        </p>
      </div>

      {/* Page content */}
    </div>
  );
}
```

## Example 2: Help Icons in Form Fields

```tsx
import { ContextHelp } from '@/components/help/context-help';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export function PolicyForm() {
  return (
    <div className="space-y-4">
      {/* Policy selection with help */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="policy">DMARC Policy</Label>
          <ContextHelp
            title="DMARC Policy Options"
            description="none = monitor only, quarantine = mark as spam, reject = block email"
            href="/help/policies"
            size="sm"
          />
        </div>
        <Select id="policy">
          <option value="none">None (Monitor)</option>
          <option value="quarantine">Quarantine</option>
          <option value="reject">Reject</option>
        </Select>
      </div>

      {/* Percentage with help */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="percentage">Enforcement Percentage</Label>
          <ContextHelp
            title="Policy Percentage"
            description="Start with a low percentage (e.g., 10%) and gradually increase"
            href="/help/policies#percentage"
            size="sm"
          />
        </div>
        <Input id="percentage" type="number" min="0" max="100" />
      </div>
    </div>
  );
}
```

## Example 3: Help Cards for Feature Sections

```tsx
import { ContextHelpCard } from '@/components/help/context-help';

export function OnboardingPage() {
  return (
    <div className="space-y-6">
      <h1>Getting Started</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Help card for domain setup */}
        <ContextHelpCard
          title="Setting Up Your First Domain"
          description="Learn how to add a domain, configure DNS records, and verify ownership"
          href="/help/getting-started"
        />

        {/* Help card for DMARC basics */}
        <ContextHelpCard
          title="Understanding DMARC"
          description="Learn about DMARC, SPF, DKIM, and how they work together"
          href="/help/dmarc-basics"
        />

        {/* Help card for reports */}
        <ContextHelpCard
          title="Reading DMARC Reports"
          description="Understand what your DMARC reports tell you about email authentication"
          href="/help/understanding-reports"
        />

        {/* Help card for troubleshooting */}
        <ContextHelpCard
          title="Common Issues & Solutions"
          description="Find solutions to authentication failures and configuration problems"
          href="/help/troubleshooting"
        />
      </div>
    </div>
  );
}
```

## Example 4: Inline Help in Complex Tables

```tsx
import { ContextHelp } from '@/components/help/context-help';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function SourcesTable() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Email Sources</h2>
          <ContextHelp
            title="About email sources"
            description="Sources are the servers and IPs that send email on behalf of your domain"
            href="/help/sources"
          />
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <div className="flex items-center gap-2">
                IP Address
                <ContextHelp
                  title="Source IP"
                  description="The IP address that sent the email"
                  size="sm"
                />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                SPF Alignment
                <ContextHelp
                  title="SPF Alignment"
                  description="Whether the SPF check passed and aligned with your domain"
                  href="/help/dmarc-basics#spf-alignment"
                  size="sm"
                />
              </div>
            </TableHead>
            <TableHead>
              <div className="flex items-center gap-2">
                DKIM Alignment
                <ContextHelp
                  title="DKIM Alignment"
                  description="Whether DKIM signatures verified and aligned"
                  href="/help/dmarc-basics#dkim-alignment"
                  size="sm"
                />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Table rows */}
        </TableBody>
      </Table>
    </div>
  );
}
```

## Example 5: Alert Configuration with Help

```tsx
import { ContextHelp } from '@/components/help/context-help';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function AlertSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Alert Rules
          <ContextHelp
            title="Configure alerts"
            description="Set up notifications for authentication failures and anomalies"
            href="/help/alerts"
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New source alert */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="new-source">New Source Alert</Label>
            <ContextHelp
              title="New source alerts"
              description="Get notified when email is sent from a new IP address"
              size="sm"
            />
          </div>
          <Switch id="new-source" />
        </div>

        {/* Pass rate alert */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label htmlFor="pass-rate">Pass Rate Drop Alert</Label>
            <ContextHelp
              title="Pass rate alerts"
              description="Alert when authentication pass rate falls below threshold"
              size="sm"
            />
          </div>
          <Switch id="pass-rate" />
        </div>
      </CardContent>
    </Card>
  );
}
```

## Example 6: Dashboard Metrics with Help

```tsx
import { ContextHelp } from '@/components/help/context-help';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function DashboardMetrics() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* DMARC Compliance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            DMARC Compliance
          </CardTitle>
          <ContextHelp
            title="DMARC Compliance Rate"
            description="Percentage of emails that pass DMARC authentication"
            href="/help/understanding-reports#compliance"
            size="sm"
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">94.5%</div>
          <p className="text-xs text-muted-foreground">
            +2.1% from last week
          </p>
        </CardContent>
      </Card>

      {/* SPF Pass Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            SPF Pass Rate
          </CardTitle>
          <ContextHelp
            title="SPF Pass Rate"
            description="Percentage of emails passing SPF verification"
            href="/help/dmarc-basics#spf"
            size="sm"
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">96.2%</div>
        </CardContent>
      </Card>

      {/* DKIM Pass Rate */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            DKIM Pass Rate
          </CardTitle>
          <ContextHelp
            title="DKIM Pass Rate"
            description="Percentage of emails with valid DKIM signatures"
            href="/help/dmarc-basics#dkim"
            size="sm"
          />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">92.8%</div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Example 7: Settings Page with Multiple Help Points

```tsx
import { ContextHelp } from '@/components/help/context-help';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export function GmailImportSettings() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Gmail Import</h1>
          <ContextHelp
            title="Gmail Import Setup"
            description="Automatically import DMARC reports from your Gmail account"
            href="/help/gmail-import"
          />
        </div>
        <p className="text-muted-foreground">
          Connect Gmail to automatically import DMARC reports
        </p>
      </div>

      {/* Connection card */}
      <Card>
        <CardHeader>
          <CardTitle>Gmail Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Gmail Address</Label>
              <ContextHelp
                title="Gmail address"
                description="Use the Gmail address where DMARC reports are received"
                size="sm"
              />
            </div>
            <Input type="email" placeholder="reports@example.com" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Import Schedule</Label>
              <ContextHelp
                title="Import schedule"
                description="How often to check for new reports (hourly recommended)"
                size="sm"
              />
            </div>
            <Select>
              <option value="hourly">Every Hour</option>
              <option value="daily">Daily</option>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label>Label Filter</Label>
              <ContextHelp
                title="Gmail label filter"
                description="Only import emails with this Gmail label (optional)"
                size="sm"
              />
            </div>
            <Input placeholder="DMARC" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

## Example 8: Empty States with Help Links

```tsx
import { ContextHelpCard } from '@/components/help/context-help';
import { Button } from '@/components/ui/button';

export function EmptyDomainsState() {
  return (
    <div className="text-center py-12 space-y-6">
      <div>
        <h3 className="text-lg font-semibold">No domains yet</h3>
        <p className="text-muted-foreground mt-2">
          Get started by adding your first domain
        </p>
      </div>

      <Button>Add Domain</Button>

      <div className="max-w-md mx-auto">
        <ContextHelpCard
          title="New to DMARC?"
          description="Learn how to set up your first domain and start monitoring email authentication"
          href="/help/getting-started"
        />
      </div>
    </div>
  );
}
```

## Example 9: Error States with Help

```tsx
import { ContextHelp } from '@/components/help/context-help';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function AuthenticationError() {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        DMARC Authentication Failing
        <ContextHelp
          title="Fix authentication failures"
          description="Learn how to troubleshoot and fix DMARC authentication issues"
          href="/help/troubleshooting#authentication-issues"
          size="sm"
        />
      </AlertTitle>
      <AlertDescription>
        Your domain is experiencing high authentication failure rates.
        This may affect email deliverability.
      </AlertDescription>
    </Alert>
  );
}
```

## Best Practices Demonstrated

1. **Consistent Placement**: Help icons are consistently placed to the right of titles/labels
2. **Appropriate Sizing**: Use `size="sm"` for inline help, default for page headers
3. **Clear Descriptions**: Tooltip descriptions provide immediate value
4. **Deep Linking**: Link to specific sections using URL fragments (`#section-id`)
5. **Progressive Disclosure**: Use help cards for broader topics, tooltips for specific fields
6. **Accessibility**: All examples maintain keyboard navigation and screen reader support

## Quick Reference

```tsx
// Minimal (links to general help)
<ContextHelp />

// With article reference
<ContextHelp article="dmarc-basics" />

// Full configuration
<ContextHelp
  title="Custom Title"
  description="Helpful description"
  href="/help/custom-page"
  size="md"
  className="ml-2"
/>

// Help card variant
<ContextHelpCard
  title="Feature Title"
  description="Feature description"
  href="/help/feature"
/>
```
