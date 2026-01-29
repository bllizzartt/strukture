import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Redirect authenticated users away from auth pages
    if (token && (path === '/login' || path === '/register')) {
      const redirectUrl = token.role === 'LANDLORD' ? '/landlord/dashboard' : '/tenant/dashboard';
      return NextResponse.redirect(new URL(redirectUrl, req.url));
    }

    // Protect tenant routes
    if (path.startsWith('/tenant')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      if (token.role !== 'TENANT' && token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/landlord/dashboard', req.url));
      }
    }

    // Protect landlord routes
    if (path.startsWith('/landlord')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      if (token.role !== 'LANDLORD' && token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/tenant/dashboard', req.url));
      }
    }

    // Protect admin routes
    if (path.startsWith('/admin')) {
      if (!token || token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Allow all public routes - be explicit
        if (
          path === '/' ||
          path === '/login' ||
          path === '/register' ||
          path.startsWith('/api/') ||
          path.startsWith('/onboarding')
        ) {
          return true;
        }

        // Require authentication for protected routes
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/).*)',
  ],
};
