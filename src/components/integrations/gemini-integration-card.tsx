'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
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

interface GeminiIntegrationData {
  configured: boolean;
  isEnabled: boolean;
  hasApiKey: boolean;
  apiKeySetAt?: string | null;
  lastUsedAt?: string | null;
  usageCount24h: number;
  usageResetsIn?: number | null;
  dailyLimit: number;
  lastError?: string | null;
  lastErrorAt?: string | null;
}

interface GeminiIntegrationCardProps {
  orgSlug: string;
  canManage: boolean;
  initialData: GeminiIntegrationData;
}

function formatTimeRemaining(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function GeminiIntegrationCard({
  orgSlug,
  canManage,
  initialData,
}: GeminiIntegrationCardProps) {
  const [data, setData] = useState<GeminiIntegrationData>(initialData);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSaveApiKey = async () => {
    if (!apiKey || !apiKey.startsWith('AIza')) {
      setError('API key must start with "AIza"');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/integrations/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save API key');
      }

      setData((prev) => ({
        ...prev,
        configured: true,
        hasApiKey: true,
        isEnabled: true,
        apiKeySetAt: new Date().toISOString(),
        lastError: null,
        lastErrorAt: null,
      }));
      setApiKey('');
      setIsEditing(false);
      setTestResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestApiKey = async () => {
    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/integrations/gemini/test`,
        {
          method: 'POST',
        }
      );

      const result = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: result.message });
        setData((prev) => ({
          ...prev,
          lastError: null,
          lastErrorAt: null,
        }));
      } else {
        setTestResult({
          success: false,
          message: result.error || 'Test failed',
        });
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to test connection' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/integrations/gemini`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEnabled: enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update setting');
      }

      setData((prev) => ({ ...prev, isEnabled: enabled }));
    } catch {
      setError('Failed to update setting');
    }
  };

  const handleDeleteApiKey = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/integrations/gemini`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove API key');
      }

      setData((prev) => ({
        ...prev,
        hasApiKey: false,
        isEnabled: false,
        apiKeySetAt: null,
        lastError: null,
        lastErrorAt: null,
      }));
      setTestResult(null);
    } catch {
      setError('Failed to remove API key');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Google Gemini
            {data.hasApiKey && data.isEnabled && (
              <Badge variant="default" className="bg-purple-600">
                Active
              </Badge>
            )}
            {data.hasApiKey && !data.isEnabled && (
              <Badge variant="secondary">Disabled</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Use Gemini AI for intelligent DMARC policy recommendations
          </CardDescription>
        </div>
        {data.hasApiKey && canManage && (
          <div className="flex items-center gap-2">
            <Label htmlFor="gemini-enabled" className="text-sm">
              Enabled
            </Label>
            <Switch
              id="gemini-enabled"
              checked={data.isEnabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Usage Stats */}
        {data.hasApiKey && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-md">
            <div className="text-sm">
              <span className="font-medium">Daily Usage: </span>
              <span
                className={
                  data.usageCount24h >= data.dailyLimit
                    ? 'text-destructive'
                    : ''
                }
              >
                {data.usageCount24h} / {data.dailyLimit} requests
              </span>
            </div>
            {data.usageResetsIn && data.usageCount24h > 0 && (
              <div className="text-xs text-muted-foreground">
                Resets in {formatTimeRemaining(data.usageResetsIn)}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {data.lastError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {data.lastError}
              {data.lastErrorAt && (
                <span className="text-xs ml-2">
                  ({new Date(data.lastErrorAt).toLocaleString()})
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            {testResult.success ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}

        {/* API Key Configuration */}
        {canManage && (
          <>
            {!data.hasApiKey || isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key">Gemini API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="api-key"
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="AIza..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      onClick={handleSaveApiKey}
                      disabled={!apiKey || isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    {isEditing && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditing(false);
                          setApiKey('');
                          setError(null);
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your free API key from{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Google AI Studio
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium">API Key Configured</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {maskApiKey('AIza••••••••••••••••')}
                    {data.apiKeySetAt && (
                      <span className="ml-2 font-sans">
                        (added{' '}
                        {new Date(data.apiKeySetAt).toLocaleDateString()})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestApiKey}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Update Key
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove API Key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the Gemini API key and disable AI
                          recommendations. Cached recommendations will be
                          preserved.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteApiKey}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            'Remove'
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}
          </>
        )}

        {!canManage && !data.hasApiKey && (
          <p className="text-sm text-muted-foreground">
            Contact an organisation admin to configure AI integrations.
          </p>
        )}

        {/* Free Tier Info */}
        <div className="text-xs text-muted-foreground border-t pt-4">
          <p>
            The free tier includes {data.dailyLimit} AI analysis requests per
            day. Recommendations are cached for 24 hours to minimise API usage.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
