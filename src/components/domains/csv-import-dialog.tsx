'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface CsvImportDialogProps {
  orgSlug: string;
  disabled?: boolean;
}

interface ImportResult {
  success: boolean;
  created: number;
  skipped: number;
  errors: string[];
  message: string;
}

export function CsvImportDialog({ orgSlug, disabled }: CsvImportDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [domains, setDomains] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseDomains = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map(d => d.trim().toLowerCase())
      .filter(d => d.length > 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setDomains(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const domainList = parseDomains(domains);

    if (domainList.length === 0) {
      toast.error('No valid domains found');
      return;
    }

    if (domainList.length > 100) {
      toast.error('Maximum 100 domains per import');
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/domains/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: domainList }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setResult(data);
      toast.success(data.message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setDomains('');
    setResult(null);
  };

  const domainCount = parseDomains(domains).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled} title={disabled ? "You don't have permission to import domains" : undefined}>
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Import Domains</DialogTitle>
          <DialogDescription>
            Import multiple domains from a CSV file or paste them directly.
            One domain per line, or comma/semicolon separated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Choose File
            </Button>
            <span className="text-sm text-muted-foreground">
              or paste domains below
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="domains">Domains</Label>
            <Textarea
              id="domains"
              placeholder="example.com&#10;another-domain.com&#10;third.example.org"
              value={domains}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDomains(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {domainCount} domain{domainCount !== 1 ? 's' : ''} detected
              {domainCount > 100 && (
                <span className="text-destructive ml-2">(max 100)</span>
              )}
            </p>
          </div>

          {result && (
            <Alert variant={result.errors.length > 0 ? 'destructive' : 'default'}>
              {result.errors.length > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <AlertDescription>
                <p className="font-medium">{result.message}</p>
                {result.errors.length > 0 && (
                  <ul className="mt-2 text-xs list-disc list-inside">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li>...and {result.errors.length - 5} more errors</li>
                    )}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={importing || domainCount === 0 || domainCount > 100}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {domainCount} Domain{domainCount !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
