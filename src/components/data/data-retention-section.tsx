'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database, Loader2, Calendar, HardDrive, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface DataRetentionSectionProps {
  orgSlug: string;
  organizationId: string;
  dataRetentionDays: number;
}

interface DataStats {
  totalReports: number;
  totalRecords: number;
  totalSources: number;
  totalAlerts: number;
  oldestDataDate: string | null;
  storageEstimateMB: number;
  dataRetentionDays: number;
}

export function DataRetentionSection({
  orgSlug,
  organizationId,
  dataRetentionDays,
}: DataRetentionSectionProps) {
  const [stats, setStats] = useState<DataStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/orgs/${orgSlug}/data`);
      if (!response.ok) throw new Error('Failed to load data statistics');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to load data statistics:', error);
      toast.error('Failed to load data statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [orgSlug]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Retention
        </CardTitle>
        <CardDescription>
          View your current data retention settings and storage statistics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Retention Setting */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Current Retention Period</p>
                <p className="text-2xl font-bold">{dataRetentionDays} days</p>
              </div>
            </div>
            <Link href={`/orgs/${orgSlug}/settings`}>
              <Button variant="outline">Change Settings</Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Data older than {dataRetentionDays} days will be automatically deleted. You can change
            this setting in the general organization settings.
          </p>
        </div>

        {/* Data Statistics */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold">Data Statistics</h4>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                </div>
                <p className="text-2xl font-bold">{stats.totalReports.toLocaleString()}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Total Records</p>
                </div>
                <p className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Total Sources</p>
                </div>
                <p className="text-2xl font-bold">{stats.totalSources.toLocaleString()}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Oldest Data Date</p>
                </div>
                <p className="text-lg font-bold">{formatDate(stats.oldestDataDate)}</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Storage Estimate</p>
                </div>
                <p className="text-2xl font-bold">{stats.storageEstimateMB} MB</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Total Alerts</p>
                </div>
                <p className="text-2xl font-bold">{stats.totalAlerts.toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No data statistics available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
