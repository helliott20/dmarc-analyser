import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Simple health check endpoint for Docker/load balancer health checks
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
