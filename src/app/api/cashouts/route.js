// app/api/cashouts/route.js
import serviceRepo from '@/services/ServiceRepository';

export async function GET(request) {
  try {
    // You might want to add admin authentication here
    const cashouts = await serviceRepo.cashoutService.fetchCashouts();
    
    return new Response(JSON.stringify(cashouts), {
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, amount, wallet_ca } = body;
    
    if (!userId || !amount || !wallet_ca) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: userId, amount, wallet_ca' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cashout = await serviceRepo.cashoutService.createCashout(
      userId, 
      parseFloat(amount), 
      wallet_ca
    );
    
    return new Response(JSON.stringify(cashout), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const status = 
      error.message === 'User not found' || 
      error.message === 'Insufficient balance' ? 400 : 500;
    
    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}