// /app/api/betting/user/[userId]/route.js
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

export async function GET(request, { params }) {
  try {
    // Extract the Authorization header
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

    // Extract userId from the request params
    const userId = params.userId;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch bets for the user
    const bets = await serviceRepo.bettingService.fetchBetsBy(userId);

    const betIds = bets.map(bet => bet.id);

    console.log('Fetched the bets.. fetching matches.');

    const matches = await serviceRepo.betMatchesService.fetchMatchesWithId(betIds);

    const betsWithMatches = bets.map(bet => {
      const betMatches = matches.filter(match =>
          match.bet1_id === bet.id || match.bet2_id === bet.id
      );

      return {
          ...bet,
          matches: betMatches
      };
  });

  console.log(`Fetched bet with matches: ${JSON.stringify(betsWithMatches, null, 2)}`);


    return new Response(JSON.stringify(betsWithMatches), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}