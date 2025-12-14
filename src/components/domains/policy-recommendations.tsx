'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  Sparkles,
  RefreshCw,
  Settings,
  Lightbulb,
  FileWarning,
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
  confidence: number;
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

interface AiRecommendation {
  summary: string;
  recommendedPolicy: 'none' | 'quarantine' | 'reject';
  confidence: number;
  reasoning: string;
  dnsInsights: string | null;
  risks: string[];
  nextSteps: string[];
  readyToUpgrade: boolean;
  cached: boolean;
  generatedAt: string;
  expiresAt: string;
}

interface AiStatus {
  available: boolean;
  reason?: 'not_configured' | 'disabled';
  recommendation: AiRecommendation | null;
  source: 'cache' | 'generated' | 'none';
  canGenerate?: boolean;
  rateLimitRemaining?: number;
  rateLimitResetAt?: string | null;
  cooldownEndsAt?: string | null;
}

const policyLevels: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  none: { label: 'None (Monitor)', color: 'text-info', icon: Shield },
  quarantine: { label: 'Quarantine', color: 'text-warning', icon: ShieldAlert },
  reject: { label: 'Reject', color: 'text-success', icon: ShieldCheck },
};

const policyOrder = ['none', 'quarantine', 'reject'];

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffHours >= 24) {
    const days = Math.floor(diffHours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }
  if (diffHours >= 1) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
}

function formatCooldown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function PolicyRecommendations({
  orgSlug,
  domainId,
}: PolicyRecommendationsProps) {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI state
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Fetch rule-based recommendation
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

  // Fetch AI status
  useEffect(() => {
    async function fetchAiStatus() {
      try {
        const response = await fetch(
          `/api/orgs/${orgSlug}/domains/${domainId}/ai-recommendation`
        );
        const result = await response.json();

        if (response.ok) {
          setAiStatus(result);
        }
      } catch (err) {
        console.error('AI status fetch error:', err);
      }
    }

    fetchAiStatus();
  }, [orgSlug, domainId]);

  // Cooldown timer
  useEffect(() => {
    if (!aiStatus?.cooldownEndsAt) {
      setCooldownSeconds(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(aiStatus.cooldownEndsAt!).getTime() - Date.now()) / 1000)
      );
      setCooldownSeconds(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);

    return () => clearInterval(interval);
  }, [aiStatus?.cooldownEndsAt]);

  const handleGetAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/domains/${domainId}/ai-recommendation`,
        { method: 'POST' }
      );
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setAiStatus(prev => prev ? {
            ...prev,
            canGenerate: false,
            cooldownEndsAt: result.cooldownEndsAt,
          } : null);
          setAiError(result.error);
        } else {
          setAiError(result.error || 'Failed to generate AI analysis');
        }
        return;
      }

      setAiStatus(prev => prev ? {
        ...prev,
        recommendation: result.recommendation,
        source: result.source,
        canGenerate: false,
        cooldownEndsAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      } : null);
      setAiError(null);
    } catch (err) {
      console.error('AI analysis error:', err);
      setAiError('Failed to generate AI analysis');
    } finally {
      setAiLoading(false);
    }
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

  const aiEnabled = aiStatus?.available && aiStatus?.recommendation;
  const aiConfigured = aiStatus?.available;
  const inCooldown = cooldownSeconds > 0;
  const rateLimited = aiStatus?.rateLimitRemaining === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Policy Recommendation
          {aiEnabled && (
            <Badge
              variant="secondary"
              className="ml-2 gap-1 text-[10px] font-normal bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            >
              <Sparkles className="h-3 w-3" />
              AI-Powered
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Analysis of your DMARC compliance and policy readiness
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Analysis Section - Now at the top */}
        {aiStatus?.recommendation && !aiError && (
          <>
            {/* AI Summary Header */}
            <div className="rounded-xl border bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
                      AI Analysis
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {aiStatus.recommendation.summary || 'AI Policy Analysis'}
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGetAiAnalysis}
                  disabled={aiLoading || inCooldown || rateLimited}
                  className="shrink-0 h-8 text-xs"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", aiLoading && "animate-spin")} />
                  {inCooldown ? formatCooldown(cooldownSeconds) : 'Refresh'}
                </Button>
              </div>

              {/* AI Reasoning */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {aiStatus.recommendation.reasoning}
              </p>

              {/* DNS Insights */}
              {aiStatus.recommendation.dnsInsights && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-white/60 dark:bg-black/20">
                  <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    {aiStatus.recommendation.dnsInsights}
                  </p>
                </div>
              )}

              {/* Risks and Next Steps in columns */}
              <div className="grid gap-4 md:grid-cols-2 pt-2">
                {/* Risks */}
                {aiStatus.recommendation.risks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-destructive flex items-center gap-1 uppercase tracking-wide">
                      <FileWarning className="h-3 w-3" />
                      Risks to Consider
                    </p>
                    <ul className="space-y-1.5">
                      {aiStatus.recommendation.risks.map((risk, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive mt-2 shrink-0" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Next Steps */}
                {aiStatus.recommendation.nextSteps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase tracking-wide">
                      <CheckCircle2 className="h-3 w-3" />
                      Recommended Actions
                    </p>
                    <ul className="space-y-1.5">
                      {aiStatus.recommendation.nextSteps.map((step, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                            {i + 1}.
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex items-center justify-between pt-2 border-t border-purple-200/50 dark:border-purple-800/30">
                <span className="text-xs text-muted-foreground">
                  {aiStatus.recommendation.cached ? 'Cached' : 'Generated'} {formatRelativeTime(aiStatus.recommendation.generatedAt)}
                </span>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* AI Not Configured / Get Analysis Button */}
        {!aiStatus?.recommendation && (
          <>
            {/* Case: AI not configured */}
            {aiStatus && !aiStatus.available && aiStatus.reason === 'not_configured' && (
              <div className="rounded-lg border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Get AI-Powered Insights</p>
                    <p className="text-sm text-muted-foreground">
                      Configure your Gemini API key to get intelligent policy recommendations,
                      DNS record analysis, and actionable next steps.
                    </p>
                    <Button variant="outline" size="sm" asChild className="mt-2">
                      <Link href={`/orgs/${orgSlug}/settings/integrations`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configure AI
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Case: AI disabled */}
            {aiStatus && !aiStatus.available && aiStatus.reason === 'disabled' && (
              <div className="rounded-lg border border-dashed p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  AI analysis is currently disabled. Enable it in your integrations settings.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/orgs/${orgSlug}/settings/integrations`}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </Button>
              </div>
            )}

            {/* Case: AI configured but no recommendation yet */}
            {aiConfigured && !aiError && (
              <Button
                variant="outline"
                className="w-full gap-2 border-purple-300 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                onClick={handleGetAiAnalysis}
                disabled={aiLoading || inCooldown || rateLimited}
              >
                {aiLoading && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing with AI...
                  </>
                )}
                {!aiLoading && inCooldown && (
                  <>
                    <Clock className="h-4 w-4" />
                    Available in {formatCooldown(cooldownSeconds)}
                  </>
                )}
                {!aiLoading && rateLimited && (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Daily limit reached
                  </>
                )}
                {!aiLoading && !inCooldown && !rateLimited && (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Get AI Analysis
                  </>
                )}
              </Button>
            )}

            {/* Case: AI Error */}
            {aiError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Analysis Failed
                </div>
                <p className="text-sm text-muted-foreground">{aiError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGetAiAnalysis}
                  disabled={aiLoading || inCooldown}
                  className="border-destructive/30 hover:bg-destructive/10"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", aiLoading && "animate-spin")} />
                  Retry
                </Button>
              </div>
            )}

            <Separator />
          </>
        )}

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
