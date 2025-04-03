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
  } catch (error) {
    console.error("Firebase Admin initialization error:");
  }
}

  export async function POST(request) {
    try {
      // Parse the request body
      const { publicKey } = await request.json();
  
      // Validate the public key
      if (!publicKey || typeof publicKey !== 'string' || publicKey.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Invalid public key. A valid public key is required.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
  
      // Generate a custom token using the public key as the UID
      try {
        const customToken = await admin.auth().createCustomToken(publicKey);
  
        return new Response(
          JSON.stringify({ token: customToken }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (firebaseError) {
        return new Response(
          JSON.stringify({ error: `Firebase error: ${firebaseError.message}` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: `Failed to process request: ${error.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
