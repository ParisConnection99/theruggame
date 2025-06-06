import { serviceRepo } from '@/services/ServiceRepository';
import { geolocation } from '@vercel/edge';
import admin from 'firebase-admin';
import { logInfo, logError } from '@/utils/logger';

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

export const config = {
    runtime: 'edge', // This is important to run at the edge
};

export async function POST(request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const token = authHeader.split(' ')[1]; // Bearer <token>
        if (!token) {
            return new Response(JSON.stringify({ error: 'Unauthorized: Missing token in Authorization header' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

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
        const body = await request.json();

        const { action_type, device_info, additional_metadata } = body;


        if (!action_type || typeof action_type !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid or missing action_type.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!device_info || typeof device_info !== 'object') {
            return new Response(JSON.stringify({ error: 'Invalid or missing device_info.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const user = await serviceRepo.userService.getUserByWallet(uid);

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const forwarded = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const geoData = geolocation(request);

        const ip =
            forwarded?.split(',')[0] ||
            realIp ||
            geoData?.ip ||
            request.headers.get('cf-connecting-ip') ||
            'unknown';

        const enhanced_device_info = {
            ...device_info,
            geo: geoData ? { city: geoData.city, country: geoData.country, region: geoData.region } : {},
        };

        const logData = {
            user_id: user.user_id,
            action_type: action_type,
            ip_address: ip,
            device_info: enhanced_device_info,
            additional_metadata: additional_metadata,
        };

        try {
            await serviceRepo.activityLogService.logActivity(logData);
            return new Response(JSON.stringify({ success: true, message: 'Activity logged successfully.' }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to log activity.' }), {
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