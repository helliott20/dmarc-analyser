'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Palette, Image, Clock, Database, Trash2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  timezone: string | null;
  dataRetentionDays: number | null;
}

interface OrganizationSettingsFormProps {
  organization: Organization;
  orgSlug: string;
}

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

export function OrganizationSettingsForm({
  organization,
  orgSlug,
}: OrganizationSettingsFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: organization.name,
    logoUrl: organization.logoUrl || '',
    faviconUrl: organization.faviconUrl || '',
    primaryColor: organization.primaryColor || '#3B82F6',
    accentColor: organization.accentColor || '#10B981',
    timezone: organization.timezone || 'UTC',
    dataRetentionDays: organization.dataRetentionDays || 365,
  });

  const [logoPreview, setLogoPreview] = useState(organization.logoUrl || '');
  const [faviconPreview, setFaviconPreview] = useState(organization.faviconUrl || '');

  const handleImageUpload = (
    file: File,
    type: 'logo' | 'favicon'
  ) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (type === 'logo') {
        setLogoPreview(base64String);
        setFormData((prev) => ({ ...prev, logoUrl: base64String }));
      } else {
        setFaviconPreview(base64String);
        setFormData((prev) => ({ ...prev, faviconUrl: base64String }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update settings');
      }

      toast.success('Settings updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete organization');
      }

      toast.success('Organization deleted successfully');
      router.push('/orgs');
      router.refresh();
    } catch (error) {
      console.error('Failed to delete organization:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete organization');
      setIsDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Update your organization&apos;s name and basic details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Acme Inc."
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>
            Customize your organization&apos;s appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label htmlFor="logo">Logo</Label>
            <div className="flex items-center gap-4">
              {logoPreview && (
                <div className="relative h-20 w-20 rounded border bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'logo');
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG or SVG. Max 2MB.
                </p>
              </div>
              {logoPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLogoPreview('');
                    setFormData((prev) => ({ ...prev, logoUrl: '' }));
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Favicon Upload */}
          <div className="space-y-2">
            <Label htmlFor="favicon">Favicon</Label>
            <div className="flex items-center gap-4">
              {faviconPreview && (
                <div className="relative h-12 w-12 rounded border bg-muted flex items-center justify-center overflow-hidden">
                  <img
                    src={faviconPreview}
                    alt="Favicon preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <Input
                  id="favicon"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file, 'favicon');
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG or ICO. Max 2MB. Recommended: 32x32px
                </p>
              </div>
              {faviconPreview && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFaviconPreview('');
                    setFormData((prev) => ({ ...prev, faviconUrl: '' }));
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Color Pickers */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                  }
                  className="h-10 w-20 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.primaryColor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, primaryColor: e.target.value }))
                  }
                  className="flex-1 font-mono text-sm"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={formData.accentColor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                  }
                  className="h-10 w-20 cursor-pointer"
                />
                <Input
                  type="text"
                  value={formData.accentColor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, accentColor: e.target.value }))
                  }
                  className="flex-1 font-mono text-sm"
                  placeholder="#10B981"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Regional Settings
          </CardTitle>
          <CardDescription>
            Configure timezone and regional preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, timezone: value }))
              }
            >
              <SelectTrigger id="timezone" className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Configure data retention and storage policies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dataRetentionDays">Data Retention (days)</Label>
            <Input
              id="dataRetentionDays"
              type="number"
              min={30}
              max={3650}
              value={formData.dataRetentionDays}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  dataRetentionDays: parseInt(e.target.value) || 365,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              DMARC reports older than this will be automatically deleted. Minimum:
              30 days, Maximum: 10 years (3650 days)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that will permanently affect your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Delete Organization</h4>
              <p className="text-sm text-muted-foreground">
                Permanently delete this organization and all associated data
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  Delete Organization
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    organization <strong>{organization.name}</strong> and remove all
                    associated data including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All domains and DMARC reports</li>
                      <li>Team members and access permissions</li>
                      <li>Settings and configurations</li>
                      <li>Audit logs and historical data</li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Organization'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
