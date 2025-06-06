import { serviceRepo } from '@/services/ServiceRepository';
import PhantomConnect from '@/utils/PhantomConnect';
import { geolocation } from '@vercel/edge';
import admin from 'firebase-admin';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

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

        const uid = decodedToken.uid;

        const body = await request.json();

        const { marketId, betType, tokenName, amount, amountToAdd, isMobile } = body;


        if (marketId === undefined || marketId === null ||
            betType === undefined || betType === null ||
            tokenName === undefined || tokenName === null) {
            return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
                status: 400, // Using 400 Bad Request which is more appropriate than 404
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Check numerical parameters
        if ((amount !== undefined && amount < 0) || (amountToAdd !== undefined && amountToAdd < 0)) {
            return new Response(JSON.stringify({ error: 'Invalid parameter values: amounts cannot be negative' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch the user and check their balance
        const user = await serviceRepo.userService.getUserByWallet(uid);

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const nonce = nacl.randomBytes(24);

        const encodedNonce = bs58.encode(nonce);

        const betData = {
            user_id: user.user_id,
            market_id: marketId,
            bet_type: betType,
            token_name: tokenName,
            amount: amount,
            wallet_ca: uid,
            amount_to_add: amountToAdd,
            nonce: encodedNonce,
            status: 'pending'
        };


        // Add some logs

        const pendingBet = await serviceRepo.pendingBetsService.createPendingBet(betData);

        const { ip, device_info } = await fetchRequestData(request);
        await serviceRepo.activityLogService.logActivity({
            user_id: user.user_id,
            action_type: 'pending_bet_created',
            device_info: device_info,
            ip: ip,
            additional_metadata: ""
        });

        // If mobile handle call phantom connect and fetch the url

        if (!isMobile) {
            return new Response(JSON.stringify({
                key: encodedNonce,
                id: pendingBet.id
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            });
        } else {
            const phantomConnect = new PhantomConnect();
            try {

                const url = await phantomConnect.signAndSendTransaction(amountToAdd, uid, encodedNonce);
                return new Response(JSON.stringify({ url: url, id: pendingBet.id }), {
                    status: 201,
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (error) {
                throw error;
            }
        }
    } catch (error) {
        const status =
            error.message === 'User not found' || error.message === 'Insufficient balance'
                ? 400
                : 500;

        return new Response(JSON.stringify({ error: error.message }), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

async function fetchRequestData(request) {
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
        geo: geoData ? { city: geoData.city, country: geoData.country, region: geoData.region } : {},
    };

    return { ip, enhanced_device_info };
}