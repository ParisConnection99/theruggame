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
    console.error("Firebase Admin initialization error:", error);
  }
}

  export async function POST(request) {
    try {
      // Parse the request body
      const { publicKey } = await request.json();
      console.log("Received request for public key:", publicKey);
  
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
        console.log("Custom token created successfully for public key:", publicKey);
  
        return new Response(
          JSON.stringify({ token: customToken }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (firebaseError) {
        console.error("Firebase error while creating custom token:", {
          code: firebaseError.code,
          message: firebaseError.message,
          stack: firebaseError.stack,
        });
  
        return new Response(
          JSON.stringify({ error: `Firebase error: ${firebaseError.message}` }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } catch (error) {
      console.error("Unexpected error in /api/auth route:", {
        message: error.message,
        stack: error.stack,
      });
  
      return new Response(
        JSON.stringify({ error: `Failed to process request: ${error.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

// export async function POST(request) {
//     try {
//       const { publicKey } = await request.json();
//       console.log("Received request for public key:", publicKey);
      
//       if (!publicKey) {
//         return Response.json({ error: 'Public key is required' }, { status: 400 });
//       }
  
//       // Check if Firebase Admin is initialized
//       console.log("Firebase Admin apps:", admin.apps.length);
  
//       try {
//         const customToken = await admin.auth().createCustomToken(publicKey);
//         console.log("Custom token created successfully");
//         return Response.json({ token: customToken });
//       } catch (firebaseError) {
//         console.error("Firebase error:", {
//           code: firebaseError.code,
//           message: firebaseError.message,
//           stack: firebaseError.stack
//         });
//         return Response.json({ error: `Firebase error: ${firebaseError.message}` }, { status: 500 });
//       }
      
//     } catch (error) {
//       console.error('Route error:', {
//         message: error.message,
//         code: error.code,
//         stack: error.stack
//       });
//       return Response.json({ error: `Failed to create token: ${error.message}` }, { status: 500 });
//     }
//   }