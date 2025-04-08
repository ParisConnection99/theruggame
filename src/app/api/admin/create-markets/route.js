import { serviceRepo } from '@/services/ServiceRepository';


export async function POST(request) {
  try {
      // Extract API key from header
      const apiKey = request.headers.get('x-api-key');
      
      // Check if API key is valid (use environment variable for security)
      if (apiKey !== process.env.ADMIN_API_KEY) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' }
          });
      }
      
      const token = await serviceRepo.marketCreationService.fetchMarkets();
      // Signal Market creation
      const result = await serviceRepo.marketSignalService.signalMarketCreation();

      return new Response(JSON.stringify({
        token: token,
        marketSignalResult: result
      }), {
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