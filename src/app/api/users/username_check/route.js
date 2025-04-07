import { serviceRepo } from '@/services/ServiceRepository';
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
        // Extract Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Verify the token and extract the UID
        const token = authHeader.split(' ')[1]; // Bearer <token>
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const uid = decodedToken.uid;

        // Parse the request body
        const body = await request.json();
        if (!body.username) {
            return new Response(JSON.stringify({ error: 'Username is required.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const username = body.username;

        // Check if the username is available
        const isUsernameAvailable = await serviceRepo.userService.isUsernameAvailable(username);

        if (!isUsernameAvailable) {
            // Username already exists
            return new Response(JSON.stringify({ error: 'Username already exists.' }), {
                status: 409, // Conflict
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Update the username
        try {
            await serviceRepo.userService.updateUsername(username, uid);

            return new Response(JSON.stringify({ result: 'Username successfully updated.' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Error updating username.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}