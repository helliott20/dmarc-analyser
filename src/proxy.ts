import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check for session cookie (don't validate - let server components do that)
  // NextAuth v5 uses authjs.session-token or __Secure-authjs.session-token
  const sessionCookie = req.cookies.get('authjs.session-token') ||
                        req.cookies.get('__Secure-authjs.session-token');
  const hasSession = !!sessionCookie;

  // Debug logging - remove after fixing
  console.log('[PROXY]', { pathname, hasSession, cookies: req.cookies.getAll().map(c => c.name) });

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
  // These routes handle their own auth/redirect logic in server components
  const publicRoutes = [
    '/',           // Landing page - layout handles showLandingPage() check
    '/login',
    '/api/auth',
    '/api/webhooks', // Stripe webhooks
    '/api/debug',    // Debug endpoints
    '/help',         // Help pages
    '/privacy',      // Legal pages
    '/terms',
    '/pricing',
  ];

  const isPublicRoute = publicRoutes.some((route) => {
    if (route === '/') return pathname === '/';
    return pathname.startsWith(route);
  });

  // Redirect users with session away from login page
  if (hasSession && pathname === '/login') {
    console.log('[PROXY] Redirecting logged-in user from /login to /orgs');
    return NextResponse.redirect(new URL('/orgs', req.url));
  }

  // Redirect users without session to login page for protected routes
  if (!hasSession && !isPublicRoute) {
    console.log('[PROXY] Redirecting to login - not public route:', pathname);
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  console.log('[PROXY] Allowing through:', pathname, { isPublicRoute });
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
