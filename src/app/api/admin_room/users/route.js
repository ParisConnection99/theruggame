import { NextResponse } from 'next/server';
import { admin } from '@/services/FirebaseAdmin';
import { serviceRepo } from '@/services/ServiceRepository';

// This middleware ensures the route is only accessible in development
// You may want to replace this with proper admin authentication in production
const ensureDevMode = (req) => {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Admin routes are only available in development mode' },
      { status: 403 }
    );
  }
  return null;
};

export async function POST(req, { params }) {
  // Check if we're in development mode
  const devModeError = ensureDevMode(req);
  if (devModeError) return devModeError;
  
  try {
    const { action } = params;
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Validate the action parameter
    if (!['block', 'unblock'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be either "block" or "unblock"' },
        { status: 400 }
      );
    }
    
    // 1. Update Firebase Auth user status
    if (action === 'block') {
      await admin.auth().updateUser(userId, { disabled: true });
    } else {
      await admin.auth().updateUser(userId, { disabled: false });
    }
    
    // 2. Update Supabase user status
    const status = action === 'block' ? 'banned' : 'active';
    await serviceRepo.userService.updateStatus(userId, status);
    
    return NextResponse.json({
      success: true,
      message: `User ${userId} has been ${action === 'block' ? 'blocked' : 'unblocked'} successfully`
    });
    
  } catch (error) {
    console.error(`Error in admin users ${params.action} API:`, error);
    
    // Handle Firebase "user not found" error specifically
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'User not found in Firebase' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'An unknown error occurred' },
      { status: 500 }
    );
  }
}