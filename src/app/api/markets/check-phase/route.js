import { serviceRepo } from '@/services/ServiceRepository';
import { verifySignature } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";

// Define the handler separately
async function handler(request) {
    try {
        const body = await request.json();
        const { marketId } = body;

        if (!marketId) {
            // Try using a different approach for the error response
            return new Response(
                JSON.stringify({ error: "Market ID is required" }), 
                { 
                    status: 400, 
                    headers: { 'Content-Type': 'application/json' }
                }
            );
        }

        await serviceRepo.expiryService.checkPhase(marketId);

        // Use the same approach for success response
        return new Response(
            JSON.stringify({ success: true, marketId }),
            { 
                status: 200, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    } catch (error) {
        console.error("Error processing market phase check:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { 
                status: 500, 
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

export const POST = verifySignature(handler, {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY
});