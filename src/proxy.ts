import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Check if landing page should be shown (inline to avoid import issues in middleware)
const showLandingPage = () => {
  const envValue = process.env.ENABLE_LANDING_PAGE;
  if (envValue === 'false') return false;
  if (envValue === 'true') return true;
  return !!process.env.STRIPE_SECRET_KEY; // isSaasMode
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check for session cookie (don't validate - let server components do that)
  // NextAuth v5 uses authjs.session-token or __Secure-authjs.session-token
  const sessionCookie = req.cookies.get('authjs.session-token') ||
                        req.cookies.get('__Secure-authjs.session-token');
  const hasSession = !!sessionCookie;

  // Static assets, ACME challenges should always pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/.well-known') || // ACME/Let's Encrypt challenges
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/api/auth',
    '/api/webhooks', // Stripe webhooks
    '/api/debug',    // Debug endpoints
    '/help',         // Help pages
    '/privacy',      // Legal pages
    '/terms',
  ];

  // Add marketing routes if landing page is enabled
  if (showLandingPage()) {
    publicRoutes.push('/pricing');
  }

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow root path '/' if landing page is enabled
  if (pathname === '/' && showLandingPage()) {
    return NextResponse.next();
  }

  // Redirect users with session away from login page
  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/orgs', req.url));
  }

  // Redirect users with session from marketing pages to dashboard
  if (hasSession && (pathname === '/' || pathname === '/pricing')) {
    return NextResponse.redirect(new URL('/orgs', req.url));
  }

  // Redirect users without session to login page for protected routes
  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
