import { serviceRepo } from '@/services/ServiceRepository';


export async function GET(request) {
    try {
       const token = await serviceRepo.marketCreationService.fetchMarkets();
       return new Response(JSON.stringify(token), {
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