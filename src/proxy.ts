import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Check if landing page should be shown (inline to avoid import issues in middleware)
const showLandingPage = () => {
  const envValue = process.env.ENABLE_LANDING_PAGE;
  if (envValue === 'false') return false;
  if (envValue === 'true') return true;
  return !!process.env.STRIPE_SECRET_KEY; // isSaasMode
};

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/api/auth',
    '/api/webhooks', // Stripe webhooks
    '/api/debug',    // Debug endpoints (remove in production)
    '/help',         // Help pages
    '/privacy',      // Legal pages
    '/terms',
  ];

  // Add marketing routes if landing page is enabled
  if (showLandingPage()) {
    publicRoutes.push('/pricing');
    // Root path '/' is handled separately below
  }

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Static assets and API routes should pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Allow root path '/' if landing page is enabled
  if (pathname === '/' && showLandingPage()) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from login page
  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/orgs', req.url));
  }

  // Redirect logged-in users from marketing pages to dashboard
  if (isLoggedIn && (pathname === '/' || pathname === '/pricing')) {
    return NextResponse.redirect(new URL('/orgs', req.url));
  }

  // Redirect non-logged-in users to login page
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
