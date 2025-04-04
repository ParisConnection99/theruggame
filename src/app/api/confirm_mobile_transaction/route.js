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
        console.error("Firebase Admin initialization error:");
    }
}

export async function POST(request) {
    try {
        const body = await request.json();

        const { data, nonce, key } = body;

        if (!data || !nonce || !key) {
            return new Response(JSON.stringify({ error: 'Missing parameters.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch the session
        try {
            const session_data = await serviceRepo.sessionDataService.getByWallet_ca(key);
            const decryptedSharedSecret = encryptionService.decrypt(session_data.shared_secret);
            const convertedSharedSecret = phantomConnect.getUint8ArrayFromJsonString(decryptedSharedSecret);
            const signature = phantomConnect.decryptPayload(data, nonce, convertedSharedSecret);

            if (!signature) {
                return new Response(JSON.stringify({ error: 'Missing parameters' }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            // Now we got to check the signature
            try {
                const result = await verifyBetTransaction(signature.signature);

                // Check if session exists in database
    
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
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}