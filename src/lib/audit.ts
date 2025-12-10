import { db } from '@/db';
import { auditLogs } from '@/db/schema';

export interface LogAuditEventParams {
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: object;
  newValue?: object;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event to the database
 *
 * @example
 * ```ts
 * await logAuditEvent({
 *   organizationId: org.id,
 *   userId: session.user.id,
 *   action: 'domain.create',
 *   entityType: 'domain',
 *   entityId: newDomain.id,
 *   newValue: { domain: newDomain.domain },
 *   ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
 *   userAgent: request.headers.get('user-agent') || 'unknown'
 * });
 * ```
 */
export async function logAuditEvent(params: LogAuditEventParams) {
  try {
    await db.insert(auditLogs).values({
      organizationId: params.organizationId,
      userId: params.userId || undefined,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || undefined,
      oldValue: params.oldValue || undefined,
      newValue: params.newValue || undefined,
      ipAddress: params.ipAddress || undefined,
      userAgent: params.userAgent || undefined,
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break app functionality
    console.error('Failed to log audit event:', error);
  }
}

/**
 * Get the client's IP address from request headers
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    // x-forwarded-for may contain multiple IPs, get the first one
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Get the user agent from request headers
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}
