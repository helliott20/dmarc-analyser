import { NextResponse } from 'next/server';
import { isSaasMode } from '@/lib/config';

/**
 * GET /api/debug/config
 * Debug endpoint to check configuration - REMOVE IN PRODUCTION
 */
export async function GET() {
  return NextResponse.json({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '[SET]' : '[EMPTY/UNSET]',
    isSaasMode: isSaasMode(),
  });
}
