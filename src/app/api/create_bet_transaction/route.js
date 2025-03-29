import { serviceRepo } from '@/services/ServiceRepository';
import PhantomConnect  from '@/utils/PhantomConnect';
import admin from 'firebase-admin';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

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
    console.log('Creation pending bet transaction...');
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

        const { marketId, betType, tokenName, amount, amountToAdd, isMobile } = body;


        if (!marketId || !betType || !tokenName || !amount || !amountToAdd || !isMobile) {
            console.log('Parameters are missing.');
            return new Response(JSON.stringify({ error: 'Missing parameters' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch the user and check their balance
        const user = await serviceRepo.userService.getUserByWallet(uid);

        if (!user) {
            console.log('User not found.');
            return new Response(JSON.stringify({ error: 'User not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const nonce = nacl.randomBytes(24);

        const encodedNonce = bs58.encode(nonce);

        const betData = {
            user_id: user.user_id,
            market_id: marketId,
            bet_type: betType,
            token_name: tokenName,
            amount: amount,
            wallet_ca: uid,
            amount_to_add: amountToAdd,
            nonce: encodedNonce,
            status: 'pending'
        };

        console.log('Creating pending bet:', betData);

        await serviceRepo.pendingBetsService.createPendingBet(betData);

        // If mobile handle call phantom connect and fetch the url

        if (!isMobile) {
            console.log('It is not mobile');
            return new Response(JSON.stringify({
                key: encodedNonce
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            const phantomConnect = new PhantomConnect();
            try {
                
                const url = await phantomConnect.signAndSendTransaction(amountToAdd, uid, encodedNonce);
                return new Response(JSON.stringify({ url: url }), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (error) {
                console.log(`Error making mobile transaction. ${error}`);
                throw error;
            }
        }
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