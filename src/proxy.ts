import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check for session cookie (don't validate - let server components do that)
  const sessionCookie = req.cookies.get('authjs.session-token') ||
                        req.cookies.get('__Secure-authjs.session-token');
  const hasSession = !!sessionCookie;

  // Static assets and ACME challenges should always pass through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/.well-known') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/api/auth',
    '/api/webhooks',
    '/help',
    '/privacy',
    '/terms',
  ];

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Redirect root to login (landing page is now separate)
  if (pathname === '/') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/orgs', req.url));
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirect users with session away from login page
  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/orgs', req.url));
  }

  // Redirect users without session to login page for protected routes
  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Pass pathname to server components via header
  const response = NextResponse.next();
  response.headers.set('x-pathname', pathname);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
