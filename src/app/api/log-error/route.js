import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    // Parse the error data from the request
    const errorData = await request.json();
    
    // Add timestamp if not already provided
    if (!errorData.timestamp) {
      errorData.timestamp = new Date().toISOString();
    }
    
    // Format the error for logging
    const logEntry = JSON.stringify({
      ...errorData,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(process.cwd(), 'logs');
    await fs.mkdir(logsDir, { recursive: true });
    
    // Append to log file (one error per line for easy parsing)
    const logFile = path.join(logsDir, 'error-log.jsonl');
    await fs.appendFile(logFile, logEntry + '\n');
    
    console.error('Client error logged:', errorData.message);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}