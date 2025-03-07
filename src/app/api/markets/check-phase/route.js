import { serviceRepo } from '@/services/ServiceRepository';
import { verifySignature } from "@upstash/qstash/nextjs";
import { NextResponse } from "next/server";

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

// Export the POST method wrapped with verifySignature
export const POST = verifySignature(handler);