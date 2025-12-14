import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, aiIntegrations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrgWithAccess(
  orgSlug: string,
  userId: string,
  requiredRoles: string[] = ['owner', 'admin']
) {
  const [result] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(eq(organizations.slug, orgSlug), eq(orgMembers.userId, userId))
    );

  if (!result) return null;
  if (!requiredRoles.includes(result.role)) return null;

  return result;
}

/**
 * GET /api/orgs/[slug]/integrations/gemini
 * Get Gemini integration status (without exposing API key)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { slug } = await params;
    const access = await getOrgWithAccess(slug, session.user.id, [
      'owner',
      'admin',
      'member',
    ]);

    if (!access) {
      return NextResponse.json(
        { error: 'Organisation not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const [integration] = await db
      .select({
        id: aiIntegrations.id,
        isEnabled: aiIntegrations.isEnabled,
        hasApiKey: aiIntegrations.geminiApiKey,
        apiKeySetAt: aiIntegrations.geminiApiKeySetAt,
        lastUsedAt: aiIntegrations.lastUsedAt,
        usageCount24h: aiIntegrations.usageCount24h,
        usageResetAt: aiIntegrations.usageResetAt,
        lastError: aiIntegrations.lastError,
        lastErrorAt: aiIntegrations.lastErrorAt,
        createdAt: aiIntegrations.createdAt,
      })
      .from(aiIntegrations)
      .where(eq(aiIntegrations.organizationId, access.organization.id));

    if (!integration) {
      return NextResponse.json({
        configured: false,
        isEnabled: false,
        hasApiKey: false,
        usageCount24h: 0,
        dailyLimit: 100,
      });
    }

    // Calculate time until usage reset
    let usageResetsIn = null;
    if (integration.usageResetAt) {
      const resetAt = new Date(
        integration.usageResetAt.getTime() + 24 * 60 * 60 * 1000
      );
      const now = new Date();
      if (resetAt > now) {
        usageResetsIn = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
      }
    }

    return NextResponse.json({
      configured: true,
      isEnabled: integration.isEnabled,
      hasApiKey: !!integration.hasApiKey,
      apiKeySetAt: integration.apiKeySetAt?.toISOString() || null,
      lastUsedAt: integration.lastUsedAt?.toISOString() || null,
      usageCount24h: integration.usageCount24h,
      usageResetsIn,
      dailyLimit: 100,
      lastError: integration.lastError,
      lastErrorAt: integration.lastErrorAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('Failed to get Gemini integration:', error);
    return NextResponse.json(
      { error: 'Failed to get integration status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[slug]/integrations/gemini
 * Create or update Gemini API key
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { slug } = await params;
    const access = await getOrgWithAccess(slug, session.user.id);

    if (!access) {
      return NextResponse.json(
        { error: 'Organisation not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { apiKey, isEnabled } = body;

    // Validate API key format (Gemini keys start with 'AIza')
    if (apiKey !== undefined) {
      if (typeof apiKey !== 'string' || apiKey.length < 20) {
        return NextResponse.json(
          { error: 'Invalid API key format' },
          { status: 400 }
        );
      }
      if (!apiKey.startsWith('AIza')) {
        return NextResponse.json(
          { error: 'Invalid Gemini API key format' },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    // Check if integration exists
    const [existing] = await db
      .select({ id: aiIntegrations.id })
      .from(aiIntegrations)
      .where(eq(aiIntegrations.organizationId, access.organization.id));

    if (existing) {
      // Update existing
      const updateData: Record<string, unknown> = { updatedAt: now };
      if (apiKey !== undefined) {
        updateData.geminiApiKey = apiKey;
        updateData.geminiApiKeySetAt = now;
        updateData.lastError = null;
        updateData.lastErrorAt = null;
      }
      if (isEnabled !== undefined) {
        updateData.isEnabled = isEnabled;
      }

      await db
        .update(aiIntegrations)
        .set(updateData)
        .where(eq(aiIntegrations.id, existing.id));
    } else {
      // Create new
      await db.insert(aiIntegrations).values({
        organizationId: access.organization.id,
        geminiApiKey: apiKey || null,
        geminiApiKeySetAt: apiKey ? now : null,
        isEnabled: isEnabled ?? true,
        usageCount24h: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save Gemini integration:', error);
    return NextResponse.json(
      { error: 'Failed to save integration' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[slug]/integrations/gemini
 * Remove Gemini API key
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { slug } = await params;
    const access = await getOrgWithAccess(slug, session.user.id);

    if (!access) {
      return NextResponse.json(
        { error: 'Organisation not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const [existing] = await db
      .select({ id: aiIntegrations.id })
      .from(aiIntegrations)
      .where(eq(aiIntegrations.organizationId, access.organization.id));

    if (existing) {
      await db
        .update(aiIntegrations)
        .set({
          geminiApiKey: null,
          geminiApiKeySetAt: null,
          lastError: null,
          lastErrorAt: null,
          updatedAt: new Date(),
        })
        .where(eq(aiIntegrations.id, existing.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove Gemini integration:', error);
    return NextResponse.json(
      { error: 'Failed to remove integration' },
      { status: 500 }
    );
  }
}
