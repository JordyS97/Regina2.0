import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK if it hasn't been initialized already
if (!admin.apps.length) {
    try {
        const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

        if (serviceAccountEnv) {
            let serviceAccount;
            try {
                // If it's a base64 encoded string from Vercel/env, decode it
                if (!serviceAccountEnv.startsWith('{')) {
                    const decoded = Buffer.from(serviceAccountEnv, 'base64').toString('utf-8');
                    serviceAccount = JSON.parse(decoded);
                } else {
                    serviceAccount = JSON.parse(serviceAccountEnv);
                }
            } catch (err) {
                console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY", err);
            }

            if (serviceAccount) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
        } else {
            // Log warning but don't strictly throw until a function is actually called
            console.warn("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Admin SDK features will be disabled.");
        }
    } catch (error) {
        console.error('Firebase admin initialization error', error);
    }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDb = admin.apps.length ? admin.firestore() : null;
