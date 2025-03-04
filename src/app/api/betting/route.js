import { serviceRepo } from '@/services/ServiceRepository';

export async function POST(request) {
  console.log(`Just entered the place bet route.`);
  try {
    const body = await request.json();
    const { marketId, userId, amount, betType } = body;
    
    if (!marketId || !userId || !amount || !betType) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`Before the betting service call.`);
    
    const bet = await serviceRepo.bettingService.placeBet(marketId, { 
      userId, 
      amount, 
      betType 
    });
    
    return new Response(JSON.stringify(bet), {
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