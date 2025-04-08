// /api/markets/market/[marketId]/price-history/route.js

import { serviceRepo } from '@/services/ServiceRepository';

export async function GET(request, { params }) {
    try {
        params = await params;
        const marketId = params.marketId;

        if (!marketId) {
            return new Response(JSON.stringify({ error: 'Market ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const priceHistory = await serviceRepo.marketService.fetchPriceHistory(marketId);
        return new Response(JSON.stringify(priceHistory), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}