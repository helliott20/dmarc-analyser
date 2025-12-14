import { createHash } from 'crypto';
import { db } from '@/db';
import { aiIntegrations, aiRecommendationsCache } from '@/db/schema';
import { eq, and, gte } from 'drizzle-orm';

// Types
export interface DmarcContext {
  domain: string;
  dmarcRecord: string | null;
  spfRecord: string | null;
  currentPolicy: string;
  passRate7Days: number;
  passRate30Days: number;
  passRateAllTime: number;
  totalMessages: number;
  daysMonitored: number;
  sources: {
    legitimate: number;
    unknown: number;
    suspicious: number;
    forwarded: number;
  };
}

export interface AiRecommendation {
  summary: string;
  recommendedPolicy: 'none' | 'quarantine' | 'reject';
  confidence: number;
  reasoning: string;
  dnsInsights: string | null;
  risks: string[];
  nextSteps: string[];
  readyToUpgrade: boolean;
}

export interface CachedAiRecommendation extends AiRecommendation {
  cached: boolean;
  generatedAt: string;
  expiresAt: string;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: Date | null;
  usedToday: number;
}

// Constants
const FREE_TIER_LIMIT = 100; // Requests per 24h per org (conservative limit for free tier)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between requests per domain

/**
 * Generate SHA-256 hash of input context for cache invalidation
 */
export function hashContext(context: DmarcContext): string {
  const normalized = JSON.stringify({
    domain: context.domain,
    dmarcRecord: context.dmarcRecord,
    spfRecord: context.spfRecord,
    // Round pass rates to avoid cache invalidation on tiny changes
    passRate30Days: Math.round(context.passRate30Days),
    totalMessages: Math.floor(context.totalMessages / 100) * 100, // Round to nearest 100
    sources: context.sources,
  });
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Check rate limits for an organisation
 */
export async function checkRateLimit(organizationId: string): Promise<RateLimitStatus> {
  const [integration] = await db
    .select()
    .from(aiIntegrations)
    .where(eq(aiIntegrations.organizationId, organizationId));

  if (!integration || !integration.geminiApiKey) {
    return { allowed: false, remaining: 0, resetAt: null, usedToday: 0 };
  }

  const now = new Date();
  const resetTime = integration.usageResetAt;

  // Reset counter if 24h has passed
  if (!resetTime || resetTime < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
    await db
      .update(aiIntegrations)
      .set({
        usageCount24h: 0,
        usageResetAt: now,
        updatedAt: now,
      })
      .where(eq(aiIntegrations.id, integration.id));

    return {
      allowed: true,
      remaining: FREE_TIER_LIMIT,
      resetAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      usedToday: 0,
    };
  }

  const remaining = FREE_TIER_LIMIT - integration.usageCount24h;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    resetAt: new Date(resetTime.getTime() + 24 * 60 * 60 * 1000),
    usedToday: integration.usageCount24h,
  };
}

/**
 * Increment usage counter after successful API call
 */
export async function incrementUsage(organizationId: string): Promise<void> {
  const [integration] = await db
    .select()
    .from(aiIntegrations)
    .where(eq(aiIntegrations.organizationId, organizationId));

  if (integration) {
    await db
      .update(aiIntegrations)
      .set({
        usageCount24h: integration.usageCount24h + 1,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(aiIntegrations.id, integration.id));
  }
}

/**
 * Check if domain is in cooldown period
 */
export async function checkCooldown(domainId: string): Promise<{
  inCooldown: boolean;
  cooldownEndsAt: Date | null;
}> {
  const [cached] = await db
    .select()
    .from(aiRecommendationsCache)
    .where(eq(aiRecommendationsCache.domainId, domainId));

  if (!cached) {
    return { inCooldown: false, cooldownEndsAt: null };
  }

  const cooldownEnd = new Date(cached.generatedAt.getTime() + COOLDOWN_MS);
  const now = new Date();

  if (now < cooldownEnd) {
    return { inCooldown: true, cooldownEndsAt: cooldownEnd };
  }

  return { inCooldown: false, cooldownEndsAt: null };
}

/**
 * Get cached recommendation if valid
 */
export async function getCachedRecommendation(
  domainId: string,
  contextHash: string
): Promise<CachedAiRecommendation | null> {
  const now = new Date();

  const [cached] = await db
    .select()
    .from(aiRecommendationsCache)
    .where(
      and(
        eq(aiRecommendationsCache.domainId, domainId),
        gte(aiRecommendationsCache.expiresAt, now)
      )
    );

  if (!cached) {
    return null;
  }

  // Check if context has changed significantly
  if (cached.inputHash !== contextHash) {
    return null;
  }

  const recommendation = cached.recommendation as AiRecommendation;
  return {
    ...recommendation,
    cached: true,
    generatedAt: cached.generatedAt.toISOString(),
    expiresAt: cached.expiresAt.toISOString(),
  };
}

/**
 * Save recommendation to cache
 */
export async function cacheRecommendation(
  domainId: string,
  recommendation: AiRecommendation,
  contextHash: string
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_MS);

  // Upsert cache entry
  await db
    .insert(aiRecommendationsCache)
    .values({
      domainId,
      recommendation,
      inputHash: contextHash,
      generatedAt: now,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: aiRecommendationsCache.domainId,
      set: {
        recommendation,
        inputHash: contextHash,
        generatedAt: now,
        expiresAt,
      },
    });
}

/**
 * Build the prompt for Gemini
 */
function buildPrompt(context: DmarcContext): string {
  return `You are an expert email security consultant specialising in DMARC, SPF, and DKIM. Analyse this domain's email authentication posture and provide actionable insights.

## Domain: ${context.domain}

## Current DNS Configuration:
- DMARC Record: ${context.dmarcRecord || 'Not configured'}
- SPF Record: ${context.spfRecord || 'Not configured'}
- Current DMARC Policy: p=${context.currentPolicy}

## Email Authentication Metrics:
- Monitoring Duration: ${context.daysMonitored} days
- Total Messages Analysed: ${context.totalMessages.toLocaleString()}
- Pass Rate (last 7 days): ${context.passRate7Days.toFixed(1)}%
- Pass Rate (last 30 days): ${context.passRate30Days.toFixed(1)}%
- Pass Rate (all time): ${context.passRateAllTime.toFixed(1)}%

## Sending Sources:
- Legitimate (verified): ${context.sources.legitimate}
- Unknown (unclassified): ${context.sources.unknown}
- Suspicious: ${context.sources.suspicious}
- Forwarded: ${context.sources.forwarded}

## Your Analysis Should Include:

1. **Summary**: A one-line headline summarising the domain's current state
2. **Detailed Analysis**: Explain what the data tells us about this domain's email security
3. **DNS Record Review**: Comment on the SPF and DMARC configuration if provided
4. **Policy Recommendation**: Whether to stay, upgrade, or (rarely) downgrade
5. **Specific Risks**: What could go wrong, be specific to this domain's situation
6. **Actionable Next Steps**: Prioritised actions the domain owner should take

IMPORTANT GUIDELINES:
- NEVER recommend downgrading from 'reject' unless pass rates are critically low (<70%) for 14+ days
- Unknown sources are a key blocker - they MUST be classified before policy upgrades
- Consider forwarding issues (mailing lists, auto-forwards break DMARC)
- If the SPF record looks misconfigured or overly permissive, mention it
- Be specific and actionable, not generic

Respond in this exact JSON format:
{
  "summary": "<One compelling sentence about the domain's email security status>",
  "recommendedPolicy": "none" | "quarantine" | "reject",
  "confidence": <0-100>,
  "reasoning": "<3-4 sentences explaining your analysis and recommendation>",
  "dnsInsights": "<1-2 sentences about SPF/DMARC record quality, or null if not applicable>",
  "risks": ["<specific risk 1>", "<specific risk 2>"],
  "nextSteps": ["<prioritised action 1>", "<prioritised action 2>", "<action 3>"],
  "readyToUpgrade": <boolean>
}

Policy upgrade thresholds:
- none → quarantine: 95%+ pass rate, 14+ days monitoring, <5 unknown sources
- quarantine → reject: 98%+ pass rate, 30+ days monitoring, 0 unknown sources, 500+ messages`;
}

/**
 * Parse Gemini API response
 */
function parseGeminiResponse(data: unknown): AiRecommendation {
  try {
    const typedData = data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const text = typedData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    console.log('Gemini raw response:', text);

    // Extract JSON from response (may have markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Parsed Gemini response:', JSON.stringify(parsed, null, 2));

    // Handle dnsInsights - could be null, "null", empty string, or actual content
    let dnsInsights: string | null = null;
    if (parsed.dnsInsights &&
        typeof parsed.dnsInsights === 'string' &&
        parsed.dnsInsights.toLowerCase() !== 'null' &&
        parsed.dnsInsights.trim() !== '') {
      dnsInsights = parsed.dnsInsights;
    }

    // Validate and normalise
    return {
      summary: String(parsed.summary || 'Email authentication analysis complete'),
      recommendedPolicy: ['none', 'quarantine', 'reject'].includes(parsed.recommendedPolicy)
        ? parsed.recommendedPolicy
        : 'none',
      confidence: Math.min(100, Math.max(0, parseInt(parsed.confidence) || 50)),
      reasoning: String(parsed.reasoning || 'Unable to generate reasoning'),
      dnsInsights,
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5).map(String) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 5).map(String) : [],
      readyToUpgrade: Boolean(parsed.readyToUpgrade),
    };
  } catch (error) {
    console.error('Failed to parse Gemini response:', error);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Call Gemini API to generate recommendation
 */
export async function callGemini(
  apiKey: string,
  context: DmarcContext
): Promise<AiRecommendation> {
  const prompt = buildPrompt(context);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3, // Lower for more consistent outputs
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return parseGeminiResponse(data);
}

/**
 * Record error in integration status
 */
export async function recordError(organizationId: string, error: string): Promise<void> {
  await db
    .update(aiIntegrations)
    .set({
      lastError: error,
      lastErrorAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(aiIntegrations.organizationId, organizationId));
}

/**
 * Clear error status
 */
export async function clearError(organizationId: string): Promise<void> {
  await db
    .update(aiIntegrations)
    .set({
      lastError: null,
      lastErrorAt: null,
      updatedAt: new Date(),
    })
    .where(eq(aiIntegrations.organizationId, organizationId));
}

/**
 * Get AI integration for an organisation
 */
export async function getAiIntegration(organizationId: string) {
  const [integration] = await db
    .select({
      id: aiIntegrations.id,
      isEnabled: aiIntegrations.isEnabled,
      hasApiKey: aiIntegrations.geminiApiKey,
      lastUsedAt: aiIntegrations.lastUsedAt,
      usageCount24h: aiIntegrations.usageCount24h,
      usageResetAt: aiIntegrations.usageResetAt,
      lastError: aiIntegrations.lastError,
      lastErrorAt: aiIntegrations.lastErrorAt,
    })
    .from(aiIntegrations)
    .where(eq(aiIntegrations.organizationId, organizationId));

  if (!integration) {
    return null;
  }

  return {
    ...integration,
    hasApiKey: !!integration.hasApiKey,
  };
}
