// middleware.js
import { NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|maintenance).*)',
  ],
};

export async function middleware(request) {
  try {
    const isInMaintenanceMode = await get('isInMaintenanceMode');
    
    if (isInMaintenanceMode) {
      const url = request.nextUrl.clone();
      url.pathname = '/maintenance';
      return NextResponse.rewrite(url);
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}