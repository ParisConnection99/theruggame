// /api/markets/market/[marketId]/route.js

import { serviceRepo } from '@/services/ServiceRepository';


export async function GET({ params }) {
    try {
        const marketId = await params.marketId;

        if (!marketId) {
            return new Response(JSON.stringify({ error: 'Market ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const market = await serviceRepo.marketService.getMarket(marketId);
        const priceHistory = await serviceRepo.marketService.fetchPriceHistory(marketId);
        return new Response(JSON.stringify({ market: market, priceHistory: priceHistory}), {
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