import admin from 'firebase-admin';

// Initialize admin if not already initialized
if (!admin.apps.length) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });
      console.log("Firebase Admin initialized successfully");
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
    }
  }

export async function POST(request) {
    try {
      const { publicKey } = await request.json();
      console.log("Received request for public key:", publicKey);
      
      if (!publicKey) {
        return Response.json({ error: 'Public key is required' }, { status: 400 });
      }
  
      // Check if Firebase Admin is initialized
      console.log("Firebase Admin apps:", admin.apps.length);
  
      try {
        const customToken = await admin.auth().createCustomToken(publicKey);
        console.log("Custom token created successfully");
        return Response.json({ token: customToken });
      } catch (firebaseError) {
        console.error("Firebase error:", {
          code: firebaseError.code,
          message: firebaseError.message,
          stack: firebaseError.stack
        });
        return Response.json({ error: `Firebase error: ${firebaseError.message}` }, { status: 500 });
      }
      
    } catch (error) {
      console.error('Route error:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return Response.json({ error: `Failed to create token: ${error.message}` }, { status: 500 });
    }
  }