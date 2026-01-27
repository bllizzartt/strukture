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

    // Protect onboarding routes
    if (path.startsWith('/onboarding')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
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

        // Allow public routes
        if (
          path === '/' ||
          path === '/login' ||
          path === '/register' ||
          path.startsWith('/api/auth')
        ) {
          return true;
        }

        // Require authentication for protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
