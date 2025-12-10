'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  History,
  ChevronDown,
  ChevronRight,
  Filter,
  Calendar,
  User,
  FileText,
} from 'lucide-react';

interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: any;
  newValue: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AuditLogPage() {
  const params = useParams();
  const orgSlug = params.slug as string;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Expandable rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAuditLogs();
  }, [orgSlug, pagination.page, actionFilter, entityTypeFilter, fromDate, toDate]);

  async function fetchAuditLogs() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter);
      if (entityTypeFilter && entityTypeFilter !== 'all') params.append('entityType', entityTypeFilter);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const response = await fetch(`/api/orgs/${orgSlug}/audit-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleRow(id: string) {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  }

  function resetFilters() {
    setActionFilter('all');
    setEntityTypeFilter('all');
    setFromDate('');
    setToDate('');
    setPagination({ ...pagination, page: 1 });
  }

  function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (action.includes('create') || action.includes('add')) return 'default';
    if (action.includes('delete') || action.includes('remove')) return 'destructive';
    if (action.includes('update') || action.includes('edit')) return 'secondary';
    return 'outline';
  }

  function formatActionName(action: string): string {
    return action
      .split('.')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getUserInitials(name: string | null, email: string | null): string {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '?';
  }

  const uniqueActions = Array.from(new Set(logs.map(log => log.action))).sort();
  const uniqueEntityTypes = Array.from(new Set(logs.map(log => log.entityType))).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">
          Track all activities and changes in your organization
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {formatActionName(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Entity Type</label>
              <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {uniqueEntityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          {(actionFilter || entityTypeFilter || fromDate || toDate) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {pagination.total} {pagination.total === 1 ? 'event' : 'events'} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No audit logs found</h3>
              <p className="text-muted-foreground">
                {actionFilter || entityTypeFilter || fromDate || toDate
                  ? 'Try adjusting your filters'
                  : 'Activity will appear here as actions are performed'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <Collapsible
                  key={log.id}
                  open={expandedRows.has(log.id)}
                  onOpenChange={() => toggleRow(log.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                        <div className="flex items-center justify-center">
                          {expandedRows.has(log.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 grid grid-cols-[200px_150px_120px_1fr] gap-4 items-center">
                          <div className="flex items-center gap-2 min-w-0">
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {new Date(log.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {new Date(log.createdAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-8 w-8 flex-shrink-0">
                              <AvatarImage src={log.userImage || undefined} />
                              <AvatarFallback>
                                {getUserInitials(log.userName, log.userEmail)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate">
                                {log.userName || log.userEmail || 'System'}
                              </div>
                            </div>
                          </div>

                          <div>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {formatActionName(log.action)}
                            </Badge>
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm truncate">
                              <span className="text-muted-foreground">
                                {log.entityType}
                              </span>
                              {log.entityId && (
                                <span className="text-muted-foreground ml-1">
                                  · {log.entityId.slice(0, 8)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t p-4 bg-muted/20 space-y-4">
                        {/* Metadata */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">IP Address:</span>{' '}
                            <span className="font-mono">{log.ipAddress || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">User Agent:</span>{' '}
                            <span className="font-mono text-xs truncate block">
                              {log.userAgent || 'N/A'}
                            </span>
                          </div>
                        </div>

                        {/* Changes */}
                        {(log.oldValue || log.newValue) && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Changes</h4>
                            <div className="grid grid-cols-2 gap-4">
                              {log.oldValue && (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    Old Value
                                  </div>
                                  <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                                    {JSON.stringify(log.oldValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newValue && (
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">
                                    New Value
                                  </div>
                                  <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
                {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                {pagination.total} events
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <div className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
