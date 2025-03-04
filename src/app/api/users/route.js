import { serviceRepo } from '@/services/ServiceRepository';

export async function GET(request) {
  const url = new URL(request.url);
  
  // Search users by username
  if (url.searchParams.has('search')) {
    try {
      const searchTerm = url.searchParams.get('search');
      const limit = parseInt(url.searchParams.get('limit')) || 10;
      const users = await serviceRepo.userService.searchUsers(searchTerm, limit);
      return new Response(JSON.stringify(users), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Get user by wallet
  if (url.searchParams.has('wallet')) {
    try {
      const wallet = url.searchParams.get('wallet');
      const user = await serviceRepo.userService.getUserByWallet(wallet);
   
      console.log(`Fetched user: ${user}`);
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify(user), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // Check if username is available
  if (url.searchParams.has('username_check')) {
    try {
      const username = url.searchParams.get('username_check');
      const isAvailable = await serviceRepo.userService.isUsernameAvailable(username);
      
      return new Response(JSON.stringify({ available: isAvailable }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    // Handle create user request
    if (body.wallet_ca !== undefined) {
      const { wallet_ca, username, profile_pic } = body;
      
      if (!wallet_ca) {
        return new Response(JSON.stringify({ error: 'Wallet address is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const user = await serviceRepo.userService.createUser({
        wallet_ca,
        username,
        profile_pic
      });
      
      return new Response(JSON.stringify(user), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } 
    
    // Handle update balance request
    else if (body.userId !== undefined) {
      const { userId, amount } = body;
      
      // Validate required parameters
      if (!userId) {
        return Response.json({ 
          error: 'Missing required parameter: userId' 
        }, { status: 400 });
      }
      
      if (amount === undefined || amount === null) {
        return Response.json({ 
          error: 'Missing required parameter: amount' 
        }, { status: 400 });
      }
      
      // Convert amount to number if it's a string
      const amountNum = parseFloat(amount);
      
      // Validate amount is a number
      if (isNaN(amountNum)) {
        return Response.json({ 
          error: 'Amount must be a valid number' 
        }, { status: 400 });
      }
      
      // Call the service method to update the balance
      const updatedUser = await serviceRepo.userService.updateBalance(userId, amountNum);
      
      return Response.json({
        success: true,
        user: updatedUser
      });
    }
    
    // Invalid request
    else {
      return Response.json({ 
        error: 'Invalid request: missing required parameters' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing user request:', error);
    
    // Check for specific error types
    if (error.message.includes('User not found')) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { userId, ...updatedData } = body;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate that updateData is not empty
    if (Object.keys(updatedData).length === 0) {
      return new Response(JSON.stringify({ error: 'No update data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const updatedUser = await serviceRepo.userService.updateUser(userId, updatedData);
    
    return new Response(JSON.stringify(updatedUser), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // If the error is "User not found", return 404
    if (error.message === 'User not found') {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}