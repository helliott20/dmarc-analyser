'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface KnownSender {
  id: string;
  name: string;
  description: string | null;
  category: string;
  logoUrl: string | null;
  website: string | null;
  ipRanges: string[] | null;
  dkimDomains: string[] | null;
  spfInclude: string | null;
  spfResolvedAt: Date | string | null;
  isGlobal: boolean;
}

interface KnownSenderDialogProps {
  orgSlug: string;
  sender?: KnownSender;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

export function KnownSenderDialog({
  orgSlug,
  sender,
  open,
  onOpenChange,
}: KnownSenderDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resolvingSpf, setResolvingSpf] = useState(false);
  const [spfPreview, setSpfPreview] = useState<{
    ipRanges: string[];
    includes: string[];
    errors: string[];
  } | null>(null);
  const [formData, setFormData] = useState({
    name: sender?.name || '',
    description: sender?.description || '',
    category: sender?.category || 'other',
    logoUrl: sender?.logoUrl || '',
    website: sender?.website || '',
    ipRanges: sender?.ipRanges?.join('\n') || '',
    dkimDomains: sender?.dkimDomains?.join('\n') || '',
    spfInclude: sender?.spfInclude || '',
  });

  const handleResolveSpf = async () => {
    if (!formData.spfInclude.trim()) {
      toast.error('Please enter an SPF include domain');
      return;
    }

    setResolvingSpf(true);
    setSpfPreview(null);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/known-senders/preview-spf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spfInclude: formData.spfInclude }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve SPF');
      }

      setSpfPreview({
        ipRanges: data.ipRanges,
        includes: data.includes,
        errors: data.errors,
      });

      if (data.ipRanges.length > 0) {
        toast.success(`Found ${data.ipRanges.length} IP ranges`);
      } else {
        toast.error('No IP ranges found');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve SPF');
    } finally {
      setResolvingSpf(false);
    }
  };

  const handleApplySpfRanges = () => {
    if (spfPreview?.ipRanges.length) {
      setFormData({
        ...formData,
        ipRanges: spfPreview.ipRanges.join('\n'),
      });
      toast.success('IP ranges applied');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category,
        logoUrl: formData.logoUrl || null,
        website: formData.website || null,
        ipRanges: formData.ipRanges
          ? formData.ipRanges.split('\n').filter((line) => line.trim())
          : null,
        dkimDomains: formData.dkimDomains
          ? formData.dkimDomains.split('\n').filter((line) => line.trim())
          : null,
        spfInclude: formData.spfInclude || null,
      };

      const url = sender
        ? `/api/orgs/${orgSlug}/known-senders/${sender.id}`
        : `/api/orgs/${orgSlug}/known-senders`;

      const response = await fetch(url, {
        method: sender ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save known sender');
      }

      toast.success(sender ? 'Known sender updated' : 'Known sender created');
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sender ? 'Edit Known Sender' : 'Add Known Sender'}
          </DialogTitle>
          <DialogDescription>
            {sender
              ? 'Update the known sender details'
              : 'Add a custom email sender to help identify sources'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., SendGrid"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Email service provider for transactional emails"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData({ ...formData, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spfInclude">SPF Include (auto-resolve IPs)</Label>
            <div className="flex gap-2">
              <Input
                id="spfInclude"
                value={formData.spfInclude}
                onChange={(e) => {
                  setFormData({ ...formData, spfInclude: e.target.value });
                  setSpfPreview(null);
                }}
                placeholder="_spf.google.com"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleResolveSpf}
                disabled={resolvingSpf || !formData.spfInclude.trim()}
              >
                {resolvingSpf ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  'Resolve'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter an SPF include domain to automatically lookup all IP ranges
            </p>

            {spfPreview && (
              <div className="mt-2 p-3 rounded-md bg-muted text-sm">
                {spfPreview.ipRanges.length > 0 ? (
                  <>
                    <div className="flex items-center gap-2 text-green-600 mb-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Found {spfPreview.ipRanges.length} IP ranges</span>
                    </div>
                    {spfPreview.includes.length > 0 && (
                      <p className="text-muted-foreground mb-2">
                        Resolved from: {spfPreview.includes.join(', ')}
                      </p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApplySpfRanges}
                    >
                      Apply to IP Ranges
                    </Button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>{spfPreview.errors[0] || 'No IP ranges found'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ipRanges">IP Ranges (CIDR format, one per line)</Label>
            <textarea
              id="ipRanges"
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
              value={formData.ipRanges}
              onChange={(e) =>
                setFormData({ ...formData, ipRanges: e.target.value })
              }
              placeholder="192.0.2.0/24&#10;198.51.100.0/24"
            />
            <p className="text-xs text-muted-foreground">
              Enter IP ranges in CIDR notation, or use SPF Include above to auto-resolve
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dkimDomains">DKIM Domains (one per line)</Label>
            <textarea
              id="dkimDomains"
              className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
              value={formData.dkimDomains}
              onChange={(e) =>
                setFormData({ ...formData, dkimDomains: e.target.value })
              }
              placeholder="sendgrid.net&#10;mailgun.org"
            />
            <p className="text-xs text-muted-foreground">
              Enter domains used in DKIM signatures
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : sender ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
