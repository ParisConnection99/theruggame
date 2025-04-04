import { NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';
import { serviceRepo } from '@/services/ServiceRepository';
import EncryptionService from '@/lib/EncryptionService';
const key = process.env.ENCRYPTION_KEY;
const iv = process.env.ENCRYPTION_IV;
const encryptionService = new EncryptionService(key, iv);
import admin from 'firebase-admin';

// Get this from your environment variables
const QUICKNODE_RPC_ENDPOINT = process.env.QUICKNODE_RPC_ENDPOINT;

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
    console.log('Check transaction...');
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

        console.log('Passed authentication...');

        const uid = decodedToken.uid;

        const transactionContext = await request.json();

        console.log('Encrpted data: check-transaction: ', transactionContext);

        // Decrypt the context string
        const decryptedContextString = encryptionService.decrypt(transactionContext.data);

        // Parse the string back to an object
        const decryptedContext = JSON.parse(decryptedContextString);

        const signature = decryptedContext.signature;
        const blockhash = decryptedContext.recentBlockhash;
        const lastValidBlockHeight = decryptedContext.lastValidBlockHeight;

        console.log('Fetched decrypted context: ', JSON.stringify(decryptedContext, null, 2));

        const connection = new Connection(QUICKNODE_RPC_ENDPOINT, 'confirmed');

        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash: blockhash,
                lastValidBlockHeight: lastValidBlockHeight,
            },
            'confirmed'
        );

        // Check for errors in confirmation
        if (confirmation.value.err) {
            return NextResponse.json(
                { success: false, error: `Transaction error: ${confirmation.value.err}` },
                { status: 400 }
            );
        }

        console.log('Transaction has been confirmed time to validate...');

         // Call your existing confirm_transaction API if needed
        try {
            const confirmResponse = await fetch('https://theruggame.fun/api/confirm_transaction', {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    signature: signature,
                    key: uid
                }),
            });

            if (!confirmResponse.ok) {
                console.warn(`Warning: confirm_transaction API returned ${confirmResponse.status}`);
                const result = await confirmResponse.json();
                throw new Error(result.error);
                // We continue anyway since the transaction itself succeeded
            }
        } catch (confirmError) {
            console.error('Error calling confirm_transaction:', confirmError);
            throw confirmError;
            // We continue anyway since the transaction itself succeeded
        }


    } catch (error) {
        console.error('Transaction confirming error:', error);

        return NextResponse.json(
            { success: false, error: error.message || 'Failed to confirm transaction' },
            { status: 500 }
        );
    }
}