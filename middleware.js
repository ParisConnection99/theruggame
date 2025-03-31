import { NextResponse } from 'next/server';

export function middleware(req) {
  const ip = req.ip || 'unknown';
  const rateLimit = 10; // Max requests per minute

  // Example: Simple in-memory tracking (not persistent in serverless)
  globalThis.rateLimitCache = globalThis.rateLimitCache || {};
  const now = Date.now();

  if (!globalThis.rateLimitCache[ip]) {
    globalThis.rateLimitCache[ip] = [];
  }

  // Remove old requests outside the time window
  globalThis.rateLimitCache[ip] = globalThis.rateLimitCache[ip].filter(
    (timestamp) => now - timestamp < 60000
  );

  if (globalThis.rateLimitCache[ip].length >= rateLimit) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Add new request timestamp
  globalThis.rateLimitCache[ip].push(now);

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*', // Apply to API routes
};
