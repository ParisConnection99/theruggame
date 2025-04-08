import { serviceRepo } from '@/services/ServiceRepository';
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

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

        const body = await request.json();
        const id = body.id;
        const errorMessage = body.errorMessage;

        try {
            if (errorMessage === 'Transaction was rejected by user') {
                await serviceRepo.pendingBetsService.removePendingBetById(id);
                // Remove pedding bet
            } else {
                await serviceRepo.pendingBetsService.updateStatusWithId(id, 'error');
            }
            
        } catch (error) {
            throw error;
        }

    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to updated pending bets.' },
            { status: 500 }
        );
    }
}