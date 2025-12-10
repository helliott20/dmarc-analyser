'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Download, FileText, Server, TrendingUp, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  orgSlug: string;
  domainId?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

type ExportType = 'reports' | 'sources' | 'timeline';

export function ExportButton({
  orgSlug,
  domainId,
  variant = 'outline',
  size = 'default',
}: ExportButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ExportType | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleExport = async (type: ExportType, from?: string, to?: string) => {
    setIsLoading(true);

    try {
      // Build URL based on whether we have a domainId or not
      const baseUrl = domainId
        ? `/api/orgs/${orgSlug}/domains/${domainId}/export`
        : `/api/orgs/${orgSlug}/export`;

      const params = new URLSearchParams({ type });
      if (from) params.append('dateFrom', from);
      if (to) params.append('dateTo', to);

      const url = `${baseUrl}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob and create a download link
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/i);
      const filename = filenameMatch ? filenameMatch[1] : `export-${type}-${Date.now()}.csv`;

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Reset state
      setIsDatePickerOpen(false);
      setSelectedType(null);
      setDateFrom('');
      setDateTo('');
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeSelect = (type: ExportType) => {
    setSelectedType(type);
    setIsDatePickerOpen(true);
  };

  const handleExportWithDates = () => {
    if (selectedType) {
      handleExport(selectedType, dateFrom || undefined, dateTo || undefined);
    }
  };

  const handleExportNow = (type: ExportType) => {
    handleExport(type);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant={variant} size={size} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Export Data</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleTypeSelect('reports')}>
            <FileText className="h-4 w-4 mr-2" />
            Reports
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeSelect('sources')}>
            <Server className="h-4 w-4 mr-2" />
            Sources
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTypeSelect('timeline')}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Timeline
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
        <PopoverTrigger asChild>
          <div style={{ display: 'none' }} />
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-3">
                Export {selectedType}
              </h4>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a date range to filter the export, or leave empty to export all data.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="dateFrom" className="text-sm font-medium block mb-1">
                  From Date
                </label>
                <input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="dateTo" className="text-sm font-medium block mb-1">
                  To Date
                </label>
                <input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleExportWithDates}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDatePickerOpen(false);
                  setSelectedType(null);
                  setDateFrom('');
                  setDateTo('');
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
