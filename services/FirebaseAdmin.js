import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
      //privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

export const generateCustomToken = async (uid) => {
  try {
    // Generate a custom token for the user
    const customToken = await admin.auth().createCustomToken(uid);
    return customToken;
  } catch (error) {
    console.error('Error generating custom token:', error);
    throw new Error('Failed to generate custom token');
  }
};

export async function verifyAuthToken(token) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying token:', error);
    throw new Error('Invalid or expired token');
  }
}

export { admin };