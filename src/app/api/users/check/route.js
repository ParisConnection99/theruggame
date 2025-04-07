//app/users/check
import { serviceRepo } from '@/services/ServiceRepository';
import admin from 'firebase-admin';

// Initialize admin if not already initialized
if (!admin.apps.length) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'); // Replace escaped newlines
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

const getDefaultUsername = (uid) => {
    return uid ? uid.slice(0, 6) : 'guest';
};

export async function POST(request) {
    try {
        // Validate Authorization header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Extract and verify the token
        const token = authHeader.split(' ')[1];
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(token);
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Extract UID from the token
        const uid = decodedToken.uid;

        // Fetch user data securely
        const user = await serviceRepo.userService.getUserByWallet(uid);
        const doesUserExist = user != null;

        if (!doesUserExist) {
            try {
                const username = getDefaultUsername(uid);
                await serviceRepo.userService.createUser({
                    uid,
                    username,
                    profile_pic: "",
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: 'Failed to create user' }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }

        // Return a structured response
        return new Response(JSON.stringify({ exists: doesUserExist, created: !doesUserExist }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}