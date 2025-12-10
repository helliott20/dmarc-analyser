'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface DmarcRecordCardProps {
  domain: string;
  dmarcRecord: string | null;
}

interface DmarcTag {
  tag: string;
  value: string;
  description: string;
  status: 'good' | 'warning' | 'error' | 'info';
}

function parseDmarcRecord(record: string): DmarcTag[] {
  const tags: DmarcTag[] = [];
  const parts = record.split(';').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const [tag, ...valueParts] = part.split('=');
    const value = valueParts.join('=');

    switch (tag?.toLowerCase()) {
      case 'v':
        tags.push({
          tag: 'v',
          value,
          description: 'DMARC version',
          status: value === 'DMARC1' ? 'good' : 'error',
        });
        break;
      case 'p':
        tags.push({
          tag: 'p',
          value,
          description: 'Policy for domain',
          status:
            value === 'reject'
              ? 'good'
              : value === 'quarantine'
              ? 'warning'
              : 'error',
        });
        break;
      case 'sp':
        tags.push({
          tag: 'sp',
          value,
          description: 'Policy for subdomains',
          status:
            value === 'reject'
              ? 'good'
              : value === 'quarantine'
              ? 'warning'
              : 'info',
        });
        break;
      case 'rua':
        tags.push({
          tag: 'rua',
          value,
          description: 'Aggregate report addresses',
          status: 'good',
        });
        break;
      case 'ruf':
        tags.push({
          tag: 'ruf',
          value,
          description: 'Forensic report addresses',
          status: 'good',
        });
        break;
      case 'pct':
        tags.push({
          tag: 'pct',
          value,
          description: 'Percentage of messages to apply policy',
          status: parseInt(value) === 100 ? 'good' : 'warning',
        });
        break;
      case 'adkim':
        tags.push({
          tag: 'adkim',
          value,
          description: 'DKIM alignment mode',
          status: value === 's' ? 'good' : 'info',
        });
        break;
      case 'aspf':
        tags.push({
          tag: 'aspf',
          value,
          description: 'SPF alignment mode',
          status: value === 's' ? 'good' : 'info',
        });
        break;
      default:
        if (tag) {
          tags.push({
            tag,
            value,
            description: 'Unknown tag',
            status: 'info',
          });
        }
    }
  }

  return tags;
}

export function DmarcRecordCard({ domain, dmarcRecord }: DmarcRecordCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [record, setRecord] = useState(dmarcRecord);

  const parsedTags = record ? parseDmarcRecord(record) : [];

  const copyToClipboard = async () => {
    if (!record) return;
    try {
      await navigator.clipboard.writeText(record);
      toast.success('DMARC record copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const refreshRecord = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/dns/dmarc?domain=${domain}`);
      const data = await response.json();
      if (data.record) {
        setRecord(data.record);
        toast.success('DMARC record refreshed');
      } else {
        toast.error('No DMARC record found');
      }
    } catch {
      toast.error('Failed to refresh DMARC record');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            DMARC Record
          </CardTitle>
          <CardDescription>
            Current DMARC DNS record for {domain}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {record && (
            <Button variant="outline" size="icon" onClick={copyToClipboard}>
              <Copy className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={refreshRecord}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {record ? (
          <div className="space-y-4">
            <code className="block p-3 bg-muted rounded-md text-sm font-mono break-all">
              {record}
            </code>

            <div className="grid gap-2 md:grid-cols-2">
              {parsedTags.map((tag) => (
                <div
                  key={tag.tag}
                  className="flex items-start gap-2 p-2 rounded-md bg-muted/50 overflow-hidden"
                >
                  <div className="shrink-0 mt-0.5">
                    {getStatusIcon(tag.status)}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-medium">
                        {tag.tag}=
                      </code>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {tag.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {tag.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No DMARC record found</p>
            <p className="text-sm mt-2">
              Click refresh to check for a DMARC record
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshRecord}
              disabled={isRefreshing}
              className="mt-4"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check DNS
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
