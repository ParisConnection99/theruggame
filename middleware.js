import { NextRequest, NextResponse } from 'next/server'
import { get } from '@vercel/edge-config'


export async function middleware(req) {
  // Check Edge Config to see if the maintenance page should be shown
  const isInMaintenanceMode = await get('isInMaintenanceMode')

  // If in maintenance mode, point the url pathname to the maintenance page
  if (isInMaintenanceMode) {
    req.nextUrl.pathname = `/maintenance`

    console.log('Is in maintenance mode');

    // Rewrite to the url
    return NextResponse.rewrite(req.nextUrl)
  }
}