'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileText, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Domain {
  id: string;
  domain: string;
  displayName: string | null;
}

interface Export {
  id: string;
  type: string;
  status: string;
  filters: any;
  fileSize: number | null;
  recordCount: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface DataExportSectionProps {
  orgSlug: string;
  organizationId: string;
  domains: Domain[];
}

export function DataExportSection({ orgSlug, organizationId, domains }: DataExportSectionProps) {
  const [exportType, setExportType] = useState<string>('reports');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [domainId, setDomainId] = useState<string>('all');
  const [isCreating, setIsCreating] = useState(false);
  const [exports, setExports] = useState<Export[]>([]);
  const [isLoadingExports, setIsLoadingExports] = useState(true);

  const loadExports = async () => {
    try {
      setIsLoadingExports(true);
      const response = await fetch(`/api/orgs/${orgSlug}/exports`);
      if (!response.ok) throw new Error('Failed to load exports');
      const data = await response.json();
      setExports(data.exports || []);
    } catch (error) {
      console.error('Failed to load exports:', error);
      toast.error('Failed to load exports');
    } finally {
      setIsLoadingExports(false);
    }
  };

  useEffect(() => {
    loadExports();
  }, [orgSlug]);

  const handleCreateExport = async () => {
    try {
      setIsCreating(true);

      const filters: any = { type: exportType };
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (domainId !== 'all') filters.domainId = domainId;

      const response = await fetch(`/api/orgs/${orgSlug}/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create export');
      }

      const result = await response.json();

      toast.success('Export created. Downloading now...');

      // Immediately download the export
      await handleDownload(result.id);

      // Reload exports list
      await loadExports();
    } catch (error: any) {
      console.error('Failed to create export:', error);
      toast.error(error.message || 'Failed to create export');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/exports/${exportId}?download=true`);
      if (!response.ok) throw new Error('Failed to download export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch ? filenameMatch[1] : `export-${exportId}.csv`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Your export is being downloaded');
    } catch (error) {
      console.error('Failed to download export:', error);
      toast.error('Failed to download export');
    }
  };

  const handleDelete = async (exportId: string) => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/exports/${exportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete export');

      toast.success('The export has been deleted successfully');

      await loadExports();
    } catch (error) {
      console.error('Failed to delete export:', error);
      toast.error('Failed to delete export');
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-500">Complete</Badge>;
      case 'processing':
        return <Badge className="bg-blue-500">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Data Export
        </CardTitle>
        <CardDescription>
          Export your DMARC data in CSV format. Choose export type, date range, and domain filter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Configuration */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Create New Export</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="export-type">Export Type</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger id="export-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reports">All Reports (CSV)</SelectItem>
                  <SelectItem value="sources">All Sources (CSV)</SelectItem>
                  <SelectItem value="timeline">Timeline Data (CSV)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain-filter">Domain Filter</Label>
              <Select value={domainId} onValueChange={setDomainId}>
                <SelectTrigger id="domain-filter">
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {domains.map((domain) => (
                    <SelectItem key={domain.id} value={domain.id}>
                      {domain.displayName || domain.domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-from">Date From (Optional)</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">Date To (Optional)</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <Button
            onClick={handleCreateExport}
            disabled={isCreating}
            className="w-full md:w-auto"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Export...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Create and Download Export
              </>
            )}
          </Button>
        </div>

        {/* Recent Exports */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Recent Exports</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={loadExports}
              disabled={isLoadingExports}
            >
              {isLoadingExports ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {isLoadingExports ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : exports.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No exports yet. Create your first export above.
            </p>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exports.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium capitalize">
                        {exp.type}
                      </TableCell>
                      <TableCell>{getStatusBadge(exp.status)}</TableCell>
                      <TableCell>{exp.recordCount?.toLocaleString() || 'N/A'}</TableCell>
                      <TableCell>{formatFileSize(exp.fileSize)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(exp.createdAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {exp.expiresAt ? formatDate(exp.expiresAt) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {exp.status === 'complete' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(exp.id)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(exp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
