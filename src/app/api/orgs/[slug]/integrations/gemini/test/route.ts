import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, aiIntegrations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrgWithAccess(orgSlug: string, userId: string) {
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
  if (!['owner', 'admin'].includes(result.role)) return null;

  return result;
}

/**
 * POST /api/orgs/[slug]/integrations/gemini/test
 * Test Gemini API key with a minimal request
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

    // Get the API key from the database
    const [integration] = await db
      .select({
        geminiApiKey: aiIntegrations.geminiApiKey,
      })
      .from(aiIntegrations)
      .where(eq(aiIntegrations.organizationId, access.organization.id));

    if (!integration?.geminiApiKey) {
      return NextResponse.json(
        { error: 'No API key configured' },
        { status: 400 }
      );
    }

    // Make a minimal test request to Gemini
    const testResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${integration.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Say "Connection successful" in exactly 2 words.' }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 10,
          },
        }),
      }
    );

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      let errorMessage = 'API key validation failed';

      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // Use default error message
      }

      // Update error status
      await db
        .update(aiIntegrations)
        .set({
          lastError: errorMessage,
          lastErrorAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(aiIntegrations.organizationId, access.organization.id));

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          status: testResponse.status
        },
        { status: 400 }
      );
    }

    // Clear any previous errors on success
    await db
      .update(aiIntegrations)
      .set({
        lastError: null,
        lastErrorAt: null,
        updatedAt: new Date(),
      })
      .where(eq(aiIntegrations.organizationId, access.organization.id));

    return NextResponse.json({
      success: true,
      message: 'API key is valid and working'
    });
  } catch (error) {
    console.error('Failed to test Gemini API key:', error);
    return NextResponse.json(
      { error: 'Failed to test API key' },
      { status: 500 }
    );
  }
}
