// app/api/submit-transaction/route.js
import { NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';
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


        // Parse the request body
        const body = await request.json();
        const { serializedTransaction, amount, key, wallet, destinationWallet } = body;

        if (!serializedTransaction) {
            return NextResponse.json(
                { error: 'Serialized transaction is required' },
                { status: 400 }
            );
        }

        // Create connection to QuickNode
        const connection = new Connection(QUICKNODE_RPC_ENDPOINT, 'confirmed');

        // Deserialize and submit the transaction
        const transaction = Transaction.from(Buffer.from(serializedTransaction, 'base64'));

        // Submit the transaction to the network
        const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            { skipPreflight: false, preflightCommitment: 'confirmed' }
        );

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash: transaction.recentBlockhash,
                lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
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

        // Call your existing confirm_transaction API if needed
        try {
            const confirmResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/confirm_transaction`, {
                method: 'POST',
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": request.headers.get('authorization')
                },
                body: JSON.stringify({
                    signature
                }),
            });

            if (!confirmResponse.ok) {
                console.warn(`Warning: confirm_transaction API returned ${confirmResponse.status}`);
                const result = confirmResponse.json();
                throw new Error(result.error);
                // We continue anyway since the transaction itself succeeded
            }
        } catch (confirmError) {
            console.error('Error calling confirm_transaction:', confirmError);
            throw confirmError;
            // We continue anyway since the transaction itself succeeded
        }

        return NextResponse.json({
            success: true,
            signature,
            amount
        });

    } catch (error) {
        console.error('Transaction submission error:', error);

        return NextResponse.json(
            { success: false, error: error.message || 'Failed to submit transaction' },
            { status: 500 }
        );
    }
}