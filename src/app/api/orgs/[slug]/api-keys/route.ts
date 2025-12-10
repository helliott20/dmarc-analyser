import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, apiKeys } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateApiKey, hashApiKey, getExpirationDate } from '@/lib/api-keys';
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(
  slug: string,
  userId: string,
  requiredRole?: string[]
) {
  const [membership] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  if (!membership) {
    return null;
  }

  if (requiredRole && !requiredRole.includes(membership.role)) {
    return null;
  }

  return membership;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    const keys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        scopes: apiKeys.scopes,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        isActive: apiKeys.isActive,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, membership.organization.id))
      .orderBy(apiKeys.createdAt);

    // Parse scopes from JSON string
    const parsedKeys = keys.map((key) => ({
      ...key,
      scopes: JSON.parse(key.scopes),
    }));

    return NextResponse.json(parsedKeys);
  } catch (error) {
    console.error('Failed to fetch API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id, [
      'owner',
      'admin',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, scopes, expiration } = body;

    if (!name || !scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return NextResponse.json(
        { error: 'Name and scopes are required' },
        { status: 400 }
      );
    }

    // Generate API key
    const { fullKey, prefix } = generateApiKey();
    const keyHash = hashApiKey(fullKey);

    // Calculate expiration date
    const expiresAt = getExpirationDate(expiration || 'never');

    // Create API key in database
    const [newKey] = await db
      .insert(apiKeys)
      .values({
        organizationId: membership.organization.id,
        name,
        keyPrefix: prefix,
        keyHash,
        scopes: JSON.stringify(scopes),
        expiresAt,
        isActive: true,
        createdBy: session.user.id,
      })
      .returning();

    // Log audit event
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: 'api_key.create',
      entityType: 'api_key',
      entityId: newKey.id,
      newValue: {
        name: newKey.name,
        keyPrefix: newKey.keyPrefix,
        scopes: JSON.parse(newKey.scopes),
        expiresAt: newKey.expiresAt,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Return the full key ONLY on creation (this is the only time it will be shown)
    return NextResponse.json({
      id: newKey.id,
      name: newKey.name,
      keyPrefix: newKey.keyPrefix,
      scopes: JSON.parse(newKey.scopes),
      expiresAt: newKey.expiresAt,
      isActive: newKey.isActive,
      createdAt: newKey.createdAt,
      fullKey, // Only returned on creation
    });
  } catch (error) {
    console.error('Failed to create API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 }
    );
  }
}
