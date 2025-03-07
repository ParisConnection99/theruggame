import { serviceRepo } from '@/services/ServiceRepository';
import { verifySignature } from "@upstash/qstash/nextjs";

// Define the handler separately
async function handler(request) {
    try {
        const body = await request.json();
        const { marketId } = body;

        if (!marketId) {
            return new Response.json({ error: "Market ID is required" }, { status: 400 });
        }

        await serviceRepo.expiryService.checkPhase(marketId);

        return new Response(JSON.stringify({ marketId }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (error) {
        console.error("Error processing market phase check:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const POST = verifySignature(handler, {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY
});