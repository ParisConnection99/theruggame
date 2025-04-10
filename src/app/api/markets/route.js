import { serviceRepo } from '@/services/ServiceRepository';


export async function GET() {
    try {

        const markets = await serviceRepo.marketService.getActiveMarkets();

        return new Response(JSON.stringify(markets), {
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