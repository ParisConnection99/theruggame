import { serviceRepo } from '@/services/ServiceRepository';
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

export async function GET(request, { params }) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verify the token
        const token = authHeader.split(' ')[1]; // Bearer <token>
        try {
            await admin.auth().verifyIdToken(token); // Verify the token
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const walletAddress = params.wallet_ca;

        if (!walletAddress) {
            return new Response(JSON.stringify({ error: 'Wallet address is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json'},
            });
        }

        const pendingBets = await serviceRepo.pendingBetsService.fetchPendingBetsByWalletCa(walletAddress);

        return new Response(JSON.stringify(pendingBets), {
            status: 200,
            headers: { 'Content-Type': 'application/json'},
        });
    } catch (error) {
        console.log('Error in pending bets route: ', error);
        return new Response(JSON.stringify({ error: error.message || 'An error occurred fetching pending bets' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}