import { serviceRepo } from '@/services/ServiceRepository';
import { verifyBetTransaction } from '@/utils/SolanaTransactionChecker';
import PhantomConnect from '@/utils/PhantomConnect';
import admin from 'firebase-admin';
import EncryptionService from '@/lib/EncryptionService';

const key = process.env.ENCRYPTION_KEY;
const iv = process.env.ENCRYPTION_IV;
const phantomConnect = new PhantomConnect();
const encryptionService = new EncryptionService(key, iv);


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
        // const authHeader = request.headers.get('Authorization');
        // if (!authHeader) {
        //     return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        //         status: 401,
        //         headers: { 'Content-Type': 'application/json' },
        //     });
        // }

        // // Verify the token
        // const token = authHeader.split(' ')[1]; // Bearer <token>
        // let decodedToken;
        // try {
        //     decodedToken = await admin.auth().verifyIdToken(token); // Verify the token
        // } catch (error) {
        //     return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
        //         status: 401,
        //         headers: { 'Content-Type': 'application/json' },
        //     });
        // }

        // const uid = decodedToken.uid;

        const body = await request.json();

        const { data, nonce, key } = body;

        if (!data || !nonce || !key) {
            return new Response(JSON.stringify({ error: 'Missing parameters.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log('Inside the confirm mobile transaction route. ', data, nonce);

        // Fetch the session
        try {
            const session_data = await serviceRepo.sessionDataService.getByWallet_ca(key);

            console.log(`Fetch session: ${session}`);
            
            const decryptedSharedSecret = encryptionService.decrypt(session_data.shared_secret);
            const convertedSharedSecret = phantomConnect.getUint8ArrayFromJsonString(decryptedSharedSecret);

            const signature = phantomConnect.decryptPayload(data, nonce, convertedSharedSecret);

            if (!signature) {
                return new Response(JSON.stringify({ error: 'Missing parameters' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            console.log(`Signature: Confirm mobile transaction: ${signature}`);
    
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
            throw error;
        }

    } catch (error) {
        console.error('Error processing mobile bet transaction request:', error);

        return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}