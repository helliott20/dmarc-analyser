'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ForensicReportDetail } from './forensic-report-detail';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface ForensicReport {
  id: string;
  reportId: string | null;
  feedbackType: string | null;
  reporterOrgName: string | null;
  arrivalDate: string | null;
  sourceIp: string | null;
  originalMailFrom: string | null;
  originalRcptTo: string | null;
  subject: string | null;
  messageId: string | null;
  authResults: any;
  dkimResult: string | null;
  spfResult: string | null;
  dkimDomain: string | null;
  spfDomain: string | null;
}

interface ForensicReportsTableProps {
  reports: ForensicReport[];
  orgSlug: string;
  domainId: string;
}

const ResultIcon = ({ result }: { result: string | null }) => {
  if (!result) return null;
  return result === 'pass' ? (
    <CheckCircle2 className="h-4 w-4 text-green-500" />
  ) : (
    <XCircle className="h-4 w-4 text-red-500" />
  );
};

const FeedbackTypeBadge = ({ type }: { type: string | null }) => {
  if (!type) return <Badge variant="outline">Unknown</Badge>;

  const variants: Record<string, 'destructive' | 'secondary' | 'default' | 'outline'> = {
    'auth-failure': 'destructive',
    'fraud': 'destructive',
    'abuse': 'secondary',
    'virus': 'destructive',
    'not-spam': 'default',
    'other': 'outline',
  };

  return (
    <Badge variant={variants[type] || 'outline'} className="text-xs">
      {type}
    </Badge>
  );
};

export function ForensicReportsTable({
  reports,
  orgSlug,
  domainId,
}: ForensicReportsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<ForensicReport | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const toggleRow = (reportId: string) => {
    setExpandedRow(expandedRow === reportId ? null : reportId);
  };

  const openDetailDialog = async (reportId: string) => {
    // Fetch full report details
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/domains/${domainId}/forensic/${reportId}`
      );
      if (response.ok) {
        const data = await response.json();
        setSelectedReport(data);
        setIsDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch report details:', error);
    }
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source IP</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-center">SPF</TableHead>
              <TableHead className="text-center">DKIM</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No forensic reports found
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <>
                  <TableRow key={report.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRow(report.id)}
                        className="h-6 w-6 p-0"
                      >
                        {expandedRow === report.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-sm">
                      {report.arrivalDate
                        ? new Date(report.arrivalDate).toLocaleDateString()
                        : 'N/A'}
                      <div className="text-xs text-muted-foreground">
                        {report.arrivalDate
                          ? new Date(report.arrivalDate).toLocaleTimeString()
                          : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <FeedbackTypeBadge type={report.feedbackType} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {report.sourceIp || 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {report.originalMailFrom || 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {report.originalRcptTo || 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm">
                      {report.subject || <span className="text-muted-foreground">No subject</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <ResultIcon result={report.spfResult} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ResultIcon result={report.dkimResult} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailDialog(report.id)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRow === report.id && (
                    <TableRow>
                      <TableCell colSpan={10} className="bg-muted/30 p-0">
                        <div className="p-4 space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-muted-foreground">Message ID:</span>
                              <p className="font-mono text-xs mt-1 break-all">
                                {report.messageId || 'N/A'}
                              </p>
                            </div>
                            {report.reporterOrgName && (
                              <div>
                                <span className="text-muted-foreground">Reporter:</span>
                                <p className="font-medium mt-1">{report.reporterOrgName}</p>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {report.spfDomain && (
                              <div>
                                <span className="text-muted-foreground">SPF Domain:</span>
                                <p className="font-mono text-xs mt-1">{report.spfDomain}</p>
                              </div>
                            )}
                            {report.dkimDomain && (
                              <div>
                                <span className="text-muted-foreground">DKIM Domain:</span>
                                <p className="font-mono text-xs mt-1">{report.dkimDomain}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Forensic Report Details</DialogTitle>
            <DialogDescription>
              Detailed information about this DMARC failure report
            </DialogDescription>
          </DialogHeader>
          {selectedReport && <ForensicReportDetail report={selectedReport} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
