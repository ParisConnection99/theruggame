import { serviceRepo } from '@/services/ServiceRepository';
import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/dist/nextjs/app";

// Define the handler separately
async function handler(request) {
    try {
        const body = await request.json();
        const { marketId } = body;

        if (!marketId) {
            return NextResponse.json({ error: "Market ID is required" }, { status: 400 });
        }

        await serviceRepo.expiryService.checkPhase(marketId);

        return NextResponse.json({ success: true, marketId });
    } catch (error) {
        console.error("Error processing market phase check:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Use the App Router specific verification function
export const POST = verifySignatureAppRouter(handler, {
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY
});