import { NextResponse } from 'next/server';
import { showLandingPage, isSaasMode } from '@/lib/config';

/**
 * GET /api/debug/config
 * Debug endpoint to check configuration - REMOVE IN PRODUCTION
 */
export async function GET() {
  return NextResponse.json({
    ENABLE_LANDING_PAGE: process.env.ENABLE_LANDING_PAGE,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '[SET]' : '[EMPTY/UNSET]',
    isSaasMode: isSaasMode(),
    showLandingPage: showLandingPage(),
  });
}
