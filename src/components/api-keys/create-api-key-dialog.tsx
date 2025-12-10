'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { API_SCOPES } from '@/lib/api-keys';
import { toast } from 'sonner';
import { ApiKeyDisplay } from './api-key-display';

interface CreateApiKeyDialogProps {
  orgSlug: string;
  onSuccess: () => void;
}

export function CreateApiKeyDialog({
  orgSlug,
  onSuccess,
}: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiration, setExpiration] = useState<string>('never');
  const [createdKey, setCreatedKey] = useState<{
    fullKey: string;
    name: string;
  } | null>(null);

  const handleScopeToggle = (scope: string) => {
    setScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    if (scopes.length === 0) {
      toast.error('Please select at least one scope');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, scopes, expiration }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const data = await response.json();
      setCreatedKey({ fullKey: data.fullKey, name: data.name });

      // Don't close the dialog yet - show the key first
      toast.success('API key created successfully');
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create API key'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset form after dialog closes
    setTimeout(() => {
      setName('');
      setScopes([]);
      setExpiration('never');
      setCreatedKey(null);
      if (createdKey) {
        onSuccess();
      }
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {!createdKey ? (
          <>
            <DialogHeader>
              <DialogTitle>Create API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for programmatic access to your DMARC data.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Production Server"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A descriptive name to help you identify this key
                </p>
              </div>

              <div className="space-y-2">
                <Label>Scopes</Label>
                <div className="space-y-3 rounded-md border p-4">
                  {API_SCOPES.map((scope) => (
                    <div key={scope.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope.value}
                        checked={scopes.includes(scope.value)}
                        onCheckedChange={() => handleScopeToggle(scope.value)}
                      />
                      <Label
                        htmlFor={scope.value}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {scope.label}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the permissions this API key will have
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration">Expiration</Label>
                <Select value={expiration} onValueChange={setExpiration}>
                  <SelectTrigger id="expiration" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never</SelectItem>
                    <SelectItem value="30days">30 days</SelectItem>
                    <SelectItem value="90days">90 days</SelectItem>
                    <SelectItem value="1year">1 year</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  When this key will automatically expire
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create API Key'}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <ApiKeyDisplay
            apiKey={createdKey.fullKey}
            keyName={createdKey.name}
            onClose={handleClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
