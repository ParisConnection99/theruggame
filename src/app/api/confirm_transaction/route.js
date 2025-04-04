import { serviceRepo } from '@/services/ServiceRepository';
import { verifyBetTransaction } from '@/utils/SolanaTransactionChecker';
import admin from 'firebase-admin';


// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
        console.log("Firebase Admin initialized successfully");
    } catch (error) {
        console.error("Firebase Admin initialization error:");
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        const { signature, uid } = body;

        console.log(`Signature: ${signature}`);

        if (!signature) {
            return new Response(JSON.stringify({ error: 'Missing parameters' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        try {
            const result = await verifyBetTransaction(signature);

            if (result.success) {
                return new Response(JSON.stringify({ result: 'Success' }), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                });
            } else {

                // Update the pending bets with the error
                const pendingBet = await serviceRepo.pendingBetsService.fetchPendingBetByWalletCa(uid);

                const pendingBetData = {
                    ...pendingBet,
                    status: 'error',
                    signature: signature
                };

                await serviceRepo.pendingBetsService.updatePendingBetById(pendingBet.id, pendingBetData);
                return new Response(JSON.stringify({ result: 'Failure', error: result.error?.message || "Unknown error" }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

        } catch (error) {
            return new Response(JSON.stringify({ error: 'Error verifying transaction' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}