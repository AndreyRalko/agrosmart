import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Пропускаем API-прокси и бэкенд-пути
  if (pathname.startsWith('/backend') ||
      pathname.startsWith('/api') || 
      pathname.startsWith('/admin') || 
      pathname.startsWith('/token') ||
      pathname.startsWith('/static') ||
      pathname.startsWith('/media') ||
      pathname.startsWith('/healthz')) {
    return NextResponse.next();
  }

  const publicRoutes = ['/login', '/register', '/'];
  const isPublicRoute = publicRoutes.some(route => pathname === route);

  const token = request.cookies.get('access_token');

  if (pathname === '/' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|backend|api|admin|token|static|media|healthz|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};