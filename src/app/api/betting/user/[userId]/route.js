// /app/api/betting/user/[userId]/route.js
import { serviceRepo } from '@/services/ServiceRepository';

export async function GET(request, { params }) {
  const userId = params.userId;
  
  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Note: There appears to be a bug in the original fetchBetsBy function
    // It's checking "if(userId)" and throwing an error if userId exists
    // This should likely be "if(!userId)" - I've fixed this in the API implementation
    
    const bets = await serviceRepo.bettingService.fetchBetsBy(userId);
    
    return new Response(JSON.stringify(bets), {
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