// app/api/cashouts/route.js
import { serviceRepo } from '@/services/ServiceRepository';
import { geolocation } from '@vercel/edge';
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

export const config = {
  runtime: 'edge', // This is important to run at the edge
};


export async function GET(request) {
  try {
    // You might want to add admin authentication here
    const cashouts = await serviceRepo.cashoutService.fetchCashouts();

    return new Response(JSON.stringify(cashouts), {
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

      // Parse and validate the request body
      const body = await request.json();
      const { amount, device_info, wallet_address } = body;

      if (!amount || typeof amount !== 'number' || amount <= 0) {
          return new Response(JSON.stringify({ error: 'Invalid amount. Must be a positive number.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
          });
      }

      if (!device_info || typeof device_info !== 'object') {
          return new Response(JSON.stringify({ error: 'Invalid device information.' }), {
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

      if (user.balance < amount) {
          return new Response(JSON.stringify({ error: 'Insufficient balance.' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
          });
      }

      // Determine the user's IP address and geolocation
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const geoData = geolocation(request);
      const ip =
          forwarded?.split(',')[0] ||
          realIp ||
          geoData.ip ||
          request.headers.get('cf-connecting-ip') || // Cloudflare specific
          'unknown';

      const enhanced_device_info = {
          ...device_info,
          geo: geoData ? { city: geoData.city, country: geoData.country, region: geoData.region } : {},
      };

      // Create the cashout
      const cashout = await serviceRepo.cashoutService.createCashout(
          user.user_id,
          parseFloat(amount),
          wallet_address,
          enhanced_device_info,
          ip
      );

      return new Response(JSON.stringify(cashout), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
      });
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