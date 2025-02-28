import serviceRepo from '@/services/ServiceRepository';

export async function GET(request) {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(segment => segment);
  
  // GET /api/odds/config
  if (pathSegments[pathSegments.length - 1] === 'config') {
    try {
      const config = serviceRepo.oddsService.getConfig();
      
      return new Response(JSON.stringify(config), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Config error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // GET /api/odds/market/:marketId
  if (pathSegments.includes('market') && pathSegments.length >= 3) {
    try {
      const marketId = pathSegments[pathSegments.indexOf('market') + 1];
      console.log(`Fetching odds for market ID: ${marketId}`);
      
      const pumpOdds = await serviceRepo.oddsService.getCurrentOdds(marketId, 'PUMP');
      const rugOdds = await serviceRepo.oddsService.getCurrentOdds(marketId, 'RUG');
      
      return new Response(JSON.stringify({
        marketId,
        pumpOdds,
        rugOdds
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Market odds error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  // GET /api/odds/:marketId/:betType
  if (pathSegments.length >= 3 && 
      ['PUMP', 'RUG'].includes(pathSegments[pathSegments.length - 1])) {
    try {
      const marketId = pathSegments[pathSegments.length - 2];
      const betType = pathSegments[pathSegments.length - 1];

      console.log(`Getting odds for marketId: ${marketId}, betType: ${betType}`);
      
      const odds = await serviceRepo.oddsService.getCurrentOdds(marketId, betType);
      
      return new Response(JSON.stringify({
        marketId,
        betType,
        odds
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error(`Error getting ${pathSegments[pathSegments.length - 1]} odds:`, error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  return new Response(JSON.stringify({ error: 'Invalid endpoint or missing parameters' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(segment => segment);
    
    // POST /api/odds/calculate
    if (pathSegments[pathSegments.length - 1] === 'calculate') {
      const { pumpAmount, rugAmount, timeRemaining } = body;
      
      // Validate inputs
      if (pumpAmount === undefined || rugAmount === undefined || timeRemaining === undefined) {
        return new Response(JSON.stringify({
          error: 'Missing required parameters: pumpAmount, rugAmount, timeRemaining'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Convert to numbers if they're strings
      const pAmount = Number(pumpAmount);
      const rAmount = Number(rugAmount);
      const tRemaining = Number(timeRemaining);
      
      // Check if inputs are valid numbers
      if (isNaN(pAmount) || isNaN(rAmount) || isNaN(tRemaining)) {
        return new Response(JSON.stringify({
          error: 'Parameters must be valid numbers'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if amounts are negative
      if (pAmount < 0 || rAmount < 0) {
        return new Response(JSON.stringify({
          error: 'Amounts cannot be negative'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if time remaining is negative
      if (tRemaining < 0) {
        return new Response(JSON.stringify({
          error: 'Time remaining cannot be negative'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const calculatedOdds = serviceRepo.oddsService.calculateOdds(pAmount, rAmount, tRemaining);
      
      return new Response(JSON.stringify(calculatedOdds), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('POST request error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}