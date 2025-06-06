// app/api/submit-transaction/route.js
import { NextResponse } from 'next/server';
import { Connection, Transaction } from '@solana/web3.js';
import { serviceRepo } from '@/services/ServiceRepository';
import admin from 'firebase-admin';
import EncryptionService from '@/lib/EncryptionService';
const key = process.env.ENCRYPTION_KEY;
const iv = process.env.ENCRYPTION_IV;
const encryptionService = new EncryptionService(key, iv);

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
        const { serializedTransaction, amount, key, wallet, destinationWallet, id } = body;

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

        try {
            await serviceRepo.pendingBetsService.updateStatusToProcessingWithId(id, signature);
        } catch (error) {
            throw error;
        }

        const { blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();

        const transactionContext = {
            recentBlockhash: blockhash,  // Use blockhash, not transaction.recentBlockhash
            lastValid: lastValidBlockHeight,
            signature: signature
        };

        const encryptedContext = encryptionService.encrypt(transactionContext);

        return NextResponse.json({
            success: true,
            data: encryptedContext
        });

    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to submit transaction' },
            { status: 500 }
        );
    }
}