import { serviceRepo } from '@/services/ServiceRepository';
import { verifyBetTransaction } from '@/utils/SolanaTransactionChecker';
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

        const { signature } = body;

        if (!signature) {
            return new Response(JSON.stringify({ error: 'Missing parameters' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`Signature: ${signature} - Router`);

        // Now we got to check the signature
        try {
            const result = await verifyBetTransaction(signature);

            if (result.success) {
                return new Response(JSON.stringify({ result: 'Success' }), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                });
            } else {
                return new Response(JSON.stringify({ result: 'Failure', error: result.error }), {
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
        console.error('Error processing bet transaction request:', error);

        // const status =
        //     error.message === 'User not found' || error.message === 'Insufficient balance'
        //         ? 400
        //         : 500;

        return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}