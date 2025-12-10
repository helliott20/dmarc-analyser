'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  Mail,
  Server,
  Shield,
  AlertTriangle,
} from 'lucide-react';

interface ForensicReportDetailProps {
  report: {
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
    deliveryResult?: string | null;
    userAgent?: string | null;
    rawReport?: string | null;
  };
}

const ResultBadge = ({ result }: { result: string | null }) => {
  if (!result) return <Badge variant="outline">Unknown</Badge>;

  const isPassing = result === 'pass';
  const variant = isPassing ? 'default' : 'destructive';

  return (
    <Badge variant={variant} className="gap-1">
      {isPassing ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {result}
    </Badge>
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
    <Badge variant={variants[type] || 'outline'}>
      {type}
    </Badge>
  );
};

export function ForensicReportDetail({ report }: ForensicReportDetailProps) {
  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Report Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Feedback Type:</span>
              <FeedbackTypeBadge type={report.feedbackType} />
            </div>
            {report.reporterOrgName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reporter:</span>
                <span className="font-medium">{report.reporterOrgName}</span>
              </div>
            )}
            {report.arrivalDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Arrival Date:</span>
                <span className="font-medium">
                  {new Date(report.arrivalDate).toLocaleString()}
                </span>
              </div>
            )}
            {report.deliveryResult && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery:</span>
                <Badge variant="outline">{report.deliveryResult}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4" />
              Source Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {report.sourceIp && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source IP:</span>
                <span className="font-mono font-medium">{report.sourceIp}</span>
              </div>
            )}
            {report.originalMailFrom && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mail From:</span>
                <span className="font-medium">{report.originalMailFrom}</span>
              </div>
            )}
            {report.originalRcptTo && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rcpt To:</span>
                <span className="font-medium">{report.originalRcptTo}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Message Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {report.subject && (
            <div>
              <span className="text-muted-foreground">Subject:</span>
              <p className="mt-1 font-medium">{report.subject}</p>
            </div>
          )}
          {report.messageId && (
            <div>
              <span className="text-muted-foreground">Message ID:</span>
              <p className="mt-1 font-mono text-xs break-all">{report.messageId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Authentication Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Authentication Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">SPF</span>
                <ResultBadge result={report.spfResult} />
              </div>
              {report.spfDomain && (
                <p className="text-xs text-muted-foreground">
                  Domain: <span className="font-mono">{report.spfDomain}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">DKIM</span>
                <ResultBadge result={report.dkimResult} />
              </div>
              {report.dkimDomain && (
                <p className="text-xs text-muted-foreground">
                  Domain: <span className="font-mono">{report.dkimDomain}</span>
                </p>
              )}
            </div>
          </div>

          {/* Detailed Auth Results (if available as JSON) */}
          {report.authResults && typeof report.authResults === 'object' && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-xs">View Detailed Authentication Results</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="rounded-lg bg-muted p-3">
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(report.authResults, null, 2)}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>

      {/* Raw Report (if available) */}
      {report.rawReport && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Raw Report</CardTitle>
            <CardDescription>
              Original forensic report data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-xs">Show Raw Report</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="rounded-lg bg-muted p-3 max-h-96 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {report.rawReport}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
