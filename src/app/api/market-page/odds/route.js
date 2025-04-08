import { serviceRepo } from '@/services/ServiceRepository';
import admin from 'firebase-admin';

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
        // const authHeader = request.headers.get('Authorization');
        // if (!authHeader) {
        //     return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        //         status: 401,
        //         headers: { 'Content-Type': 'application/json' },
        //     });
        // }

        // // Verify the token
        // const token = authHeader.split(' ')[1]; // Bearer <token>
        // try {
        //     await admin.auth().verifyIdToken(token); // Verify the token
        // } catch (error) {
        //     return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), {
        //         status: 401,
        //         headers: { 'Content-Type': 'application/json' },
        //     });
        // }

        const body = await request.json();

        const { id, type } = body;

        if (!id || !type) {
            return new Response(JSON.stringify({ error: 'Missing data.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`Fetched data in route: id: ${id}, ${type}`);

        try {

            const currentOdds = await serviceRepo.oddsService.getCurrentOdds(id, type);

            return new Reponse(JSON.stringify(currentOdds), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });

        } catch (error) {
            console.error(`Error fetching current odds: ${error.message}`);
            throw error;
        }


    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}