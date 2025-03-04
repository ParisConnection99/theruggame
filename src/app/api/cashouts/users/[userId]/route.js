// app/api/cashouts/users/[userId]/route.js
import { serviceRepo } from '@/services/ServiceRepository';

export async function GET(request, { params }) {
  try {
    params = await params;
    const userId = params.userId;
    
    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // You might want to add authentication check here to ensure
    // the requesting user has permission to access this data
    
    const cashouts = await serviceRepo.cashoutService.fetchCashoutsBy(userId);
    
    return new Response(JSON.stringify(cashouts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`Error fetching cashouts for user ${userId}:`, error);
    
    return new Response(JSON.stringify({ error: error.message || 'An error occurred fetching cashouts' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}