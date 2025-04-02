// app/api/log/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // Parse the log data from the request
    const logData = await request.json();
    
    // Add timestamp if not already provided
    if (!logData.timestamp) {
      logData.timestamp = new Date().toISOString();
    }
    
    // Enhance with request data
    const enhancedLogData = {
      ...logData,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    };
    
    // Log to Vercel logs using appropriate console method based on level
    const logLevel = logData.level || 'info';
    
    if (logLevel === 'error') {
      console.error(`[${enhancedLogData.timestamp}] ERROR:`, JSON.stringify(enhancedLogData));
    } else if (logLevel === 'warn') {
      console.warn(`[${enhancedLogData.timestamp}] WARNING:`, JSON.stringify(enhancedLogData));
    } else {
      console.log(`[${enhancedLogData.timestamp}] INFO:`, JSON.stringify(enhancedLogData));
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in logging API route:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}