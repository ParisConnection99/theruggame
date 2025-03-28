import { serviceRepo } from '@/services/ServiceRepository';
import admin from 'firebase-admin';
import { createDesktopTransaction } from '@/utils/SolanaTransactions';
import nacl from 'tweetnacl';

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
        console.error("Firebase Admin initialization error:", error);
    }
}

export async function POST(request) {
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
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token); // Verify the token
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const uid = decodedToken.uid;

        const body = await request.json();

        const { marketId, betType, tokenName, amount, amountToAdd } = body;


        if (!marketId || !betType || !tokenName || !amount || !amountToAdd) {
            return new Response(JSON.stringify({ error: 'Missing parameters' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch the user and check their balance
        const user = await serviceRepo.userService.getUserByWallet(uid);

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const nonce = nacl.randomBytes(24);

        const betData = {
            user_id: user.user_id,
            market_id: marketId,
            bet_type: betType,
            token_name: tokenName,
            amount: amount,
            amount_to_add: amountToAdd,
            nonce: nonce,
            status: 'pending'
        };

        console.log('Creating pending bet:', betData);

        const pendingBet = await serviceRepo.pendingBetsService.createPendingBet(betData);

        console.log('Pending bet:', pendingBet)
        const betId = pendingBet.id;
        const serializedTransaction = await createDesktopTransaction(uid, amount, nonce, betId);

        console.log('Serialized transaction: ',serializedTransaction);

        return new Response(JSON.stringify({
            serializedTransaction: serializedTransaction
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error processing bet transaction request:', error);

        const status =
            error.message === 'User not found' || error.message === 'Insufficient balance'
                ? 400
                : 500;

        return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}