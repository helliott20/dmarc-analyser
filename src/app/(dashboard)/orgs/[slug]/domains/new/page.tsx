'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function NewDomainPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const [domain, setDomain] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain.trim()) {
      toast.error('Domain is required');
      return;
    }

    // Basic domain validation - supports multi-level TLDs like .co.uk, .sch.uk
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;
    if (!domainRegex.test(domain.trim())) {
      toast.error('Please enter a valid domain (e.g., example.com)');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/orgs/${slug}/domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: domain.trim().toLowerCase(),
          displayName: displayName.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add domain');
      }

      const data = await response.json();
      toast.success('Domain added successfully');
      router.push(`/orgs/${slug}/domains/${data.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add domain'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/orgs/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Add Domain</CardTitle>
              <CardDescription>
                Add a new domain to monitor for DMARC reports
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Enter the root domain without www or subdomains
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name (optional)</Label>
              <Input
                id="displayName"
                placeholder="My Company"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to help identify this domain
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add Domain
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>After adding your domain, you&apos;ll need to:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Verify domain ownership via DNS TXT record</li>
            <li>Configure your DMARC record to send reports to this system</li>
            <li>Connect a Gmail account to import reports automatically</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
