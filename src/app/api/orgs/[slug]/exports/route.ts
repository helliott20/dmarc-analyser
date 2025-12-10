import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import {
  organizations,
  orgMembers,
  dataExports,
  users,
} from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrganizationWithAccess(orgSlug: string, userId: string) {
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

  return result;
}

// POST /api/orgs/[slug]/exports - Create a new export job
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await getOrganizationWithAccess(slug, session.user.id);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Organization not found or insufficient permissions' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { organization } = result;

    // Parse request body
    const body = await request.json();
    const { type, dateFrom, dateTo, domainId } = body;

    // Validate export type
    if (!type || !['reports', 'sources', 'timeline', 'all'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'Invalid export type. Must be: reports, sources, timeline, or all' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create export record
    const filters: any = {};
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;
    if (domainId) filters.domainId = domainId;

    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [exportRecord] = await db
      .insert(dataExports)
      .values({
        organizationId: organization.id,
        type: type as 'reports' | 'sources' | 'timeline' | 'all',
        status: 'complete', // For now, we'll generate synchronously
        filters: Object.keys(filters).length > 0 ? filters : null,
        createdBy: session.user.id,
        expiresAt,
      })
      .returning();

    return new Response(
      JSON.stringify({
        id: exportRecord.id,
        type: exportRecord.type,
        status: exportRecord.status,
        createdAt: exportRecord.createdAt,
        expiresAt: exportRecord.expiresAt,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Failed to create export:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create export' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET /api/orgs/[slug]/exports - List recent exports
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await getOrganizationWithAccess(slug, session.user.id);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Organization not found or insufficient permissions' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { organization } = result;

    // Get recent exports (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const exports = await db
      .select({
        id: dataExports.id,
        type: dataExports.type,
        status: dataExports.status,
        filters: dataExports.filters,
        fileUrl: dataExports.fileUrl,
        fileSize: dataExports.fileSize,
        recordCount: dataExports.recordCount,
        error: dataExports.error,
        createdAt: dataExports.createdAt,
        completedAt: dataExports.completedAt,
        expiresAt: dataExports.expiresAt,
        createdBy: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(dataExports)
      .leftJoin(users, eq(dataExports.createdBy, users.id))
      .where(eq(dataExports.organizationId, organization.id))
      .orderBy(desc(dataExports.createdAt))
      .limit(20);

    return new Response(JSON.stringify({ exports }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to fetch exports:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch exports' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
