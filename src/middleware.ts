import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  const { pathname } = request.nextUrl

  // Exclude static assets, icon, and WhatsApp webhook from login redirection
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/_next') ||
    pathname === '/icon.png' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Redirect to login if no active session cookie
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/webhook
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon.png (icon file)
     */
    '/((?!api/webhook|_next/static|_next/image|favicon.ico|icon.png).*)',
  ],
}
