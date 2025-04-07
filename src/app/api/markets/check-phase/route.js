import { serviceRepo } from '@/services/ServiceRepository';
import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

export async function POST(request) {
    // Create a receiver to verify signatures
    const receiver = new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY
    });

    try {
        // Get the signature from headers
        const signature = request.headers.get("upstash-signature");
        
        if (!signature) {
            return NextResponse.json({ error: "Missing QStash signature" }, { status: 401 });
        }

        // Get the request body as text for verification
        const bodyText = await request.text();
        
        // Verify the signature
        const isValid = await receiver.verify({
            signature,
            body: bodyText
        });

        if (!isValid) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }

        // Parse the body
        const body = JSON.parse(bodyText);
        const { marketId } = body;

        if (!marketId) {
            return NextResponse.json({ error: "Market ID is required" }, { status: 400 });
        }

        await serviceRepo.expiryService.checkPhase(marketId);

        return NextResponse.json({ success: true, marketId });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}