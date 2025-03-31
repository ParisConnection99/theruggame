import { serviceRepo } from '@/services/ServiceRepository';
import admin from 'firebase-admin';
import { geolocation } from '@vercel/edge';

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
    console.error("Firebase Admin initialization error:", error);
  }
}

export const config = {
  runtime: 'edge', // This is important to run at the edge
};

export async function POST(request) {
  console.log(`Just entered the place bet route.`);
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

    // Fetch the user + check the balance
    const body = await request.json();
    const { marketId, userId, amount, betType, token_name } = body;

    if (!marketId || !userId || !amount || !betType, !token_name) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = serviceRepo.userService.getUserById(userId);

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (user.balance < amount) {
      return new Response(JSON.stringify({ error: 'Insufficient balance.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const bet = await serviceRepo.bettingService.placeBet(marketId, {
      userId,
      amount,
      betType,
      token_name
    });

    const { ip, device_info } = await fetchRequestData(request);

    await serviceRepo.activityLogService.logActivity({
      user_id: userId,
      action_type: 'bet_added_successfully',
      device_info: device_info,
      ip: ip,
      additional_metadata: ""
    });

    return new Response(JSON.stringify(bet), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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