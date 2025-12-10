'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Info,
  Loader2,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface PolicyRecommendationsProps {
  orgSlug: string;
  domainId: string;
}

interface RecommendationData {
  currentPolicy: string;
  recommendedPolicy: string;
  confidence: number; // 0-100
  passRate: number;
  passRate7Days: number;
  passRate30Days: number;
  totalMessages: number;
  uniqueSources: number;
  knownSources: number;
  unknownSources: number;
  daysMonitored: number;
  readyToUpgrade: boolean;
  blockers: string[];
  achievements: string[];
}

const policyLevels: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  none: { label: 'None (Monitor)', color: 'text-info', icon: Shield },
  quarantine: { label: 'Quarantine', color: 'text-warning', icon: ShieldAlert },
  reject: { label: 'Reject', color: 'text-success', icon: ShieldCheck },
};

const policyOrder = ['none', 'quarantine', 'reject'];

export function PolicyRecommendations({
  orgSlug,
  domainId,
}: PolicyRecommendationsProps) {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendation() {
      try {
        const response = await fetch(
          `/api/orgs/${orgSlug}/domains/${domainId}/policy-recommendation`
        );
        const result = await response.json();

        if (!response.ok || result.error) {
          setError(result.error || 'Failed to load recommendations');
          return;
        }

        // Validate required fields exist
        if (typeof result.currentPolicy === 'undefined') {
          setError('Invalid response from server');
          return;
        }

        setData(result);
      } catch (err) {
        console.error('Policy recommendation fetch error:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendation();
  }, [orgSlug, domainId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Policy Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Policy Recommendation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            {error || 'Unable to generate recommendations. More data needed.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentPolicyInfo = policyLevels[data.currentPolicy] || policyLevels.none;
  const recommendedPolicyInfo = policyLevels[data.recommendedPolicy] || policyLevels.none;
  const CurrentIcon = currentPolicyInfo.icon;
  const RecommendedIcon = recommendedPolicyInfo.icon;

  const currentIndex = policyOrder.indexOf(data.currentPolicy);
  const recommendedIndex = policyOrder.indexOf(data.recommendedPolicy);
  const isUpgrade = recommendedIndex > currentIndex;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Policy Recommendation
        </CardTitle>
        <CardDescription>
          Analysis of your DMARC compliance and policy readiness
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current vs Recommended */}
        <div className="flex items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current</p>
            <div className={cn('flex items-center gap-2', currentPolicyInfo.color)}>
              <CurrentIcon className="h-5 w-5" />
              <span className="font-medium">{currentPolicyInfo.label}</span>
            </div>
          </div>

          {isUpgrade && data.readyToUpgrade && (
            <ArrowRight className="h-5 w-5 text-success" />
          )}

          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Recommended</p>
            <div className={cn('flex items-center gap-2', recommendedPolicyInfo.color)}>
              <RecommendedIcon className="h-5 w-5" />
              <span className="font-medium">{recommendedPolicyInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              Confidence Score
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Based on pass rate consistency, data volume, and source identification
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
            <span className="font-medium">{data.confidence}%</span>
          </div>
          <Progress value={data.confidence} className="h-2" />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pass Rate (30 days)</p>
            <p className={cn(
              'text-lg font-semibold',
              data.passRate30Days >= 95 ? 'text-success' :
              data.passRate30Days >= 80 ? 'text-warning' : 'text-destructive'
            )}>
              {data.passRate30Days}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Pass Rate (7 days)</p>
            <p className={cn(
              'text-lg font-semibold',
              data.passRate7Days >= 95 ? 'text-success' :
              data.passRate7Days >= 80 ? 'text-warning' : 'text-destructive'
            )}>
              {data.passRate7Days}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Messages</p>
            <p className="text-lg font-semibold">{data.totalMessages.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Days Monitored</p>
            <p className="text-lg font-semibold">{data.daysMonitored}</p>
          </div>
        </div>

        {/* Source Analysis */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Source Analysis</p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>{data.knownSources} known</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span>{data.unknownSources} unknown</span>
            </div>
          </div>
        </div>

        {/* Achievements */}
        {data.achievements.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-success flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Ready for upgrade
            </p>
            <ul className="space-y-1">
              {data.achievements.map((achievement, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  {achievement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Blockers */}
        {data.blockers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-warning flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Before upgrading
            </p>
            <ul className="space-y-1">
              {data.blockers.map((blocker, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                  {blocker}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Button */}
        {isUpgrade && data.readyToUpgrade && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Based on your data, you can safely upgrade your DMARC policy from{' '}
              <strong>{currentPolicyInfo.label}</strong> to{' '}
              <strong>{recommendedPolicyInfo.label}</strong>.
            </p>
            <Button className="w-full" asChild>
              <a href="/tools/generator" target="_blank">
                Generate New DMARC Record
                <ArrowRight className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
