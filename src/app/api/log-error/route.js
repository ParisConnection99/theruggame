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
    
    // const enhancedErrorData = {
    //   ...errorData,
    //   userAgent: request.headers.get('user-agent'),
    //   ip: request.headers.get('x-forwarded-for') || 'unknown',
    // };
    
    console.error('CLIENT ERROR:', JSON.stringify(errorData, null, 2));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}