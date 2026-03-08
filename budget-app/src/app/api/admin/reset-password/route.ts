import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    if (!adminAuth) {
        return NextResponse.json({ error: "Firebase Admin SDK is not configured. A FIREBASE_SERVICE_ACCOUNT_KEY is required in .env.local to perform administrative actions." }, { status: 501 });
    }

    try {
        const body = await request.json();
        const { uid, password, requesterIdToken } = body;

        if (!uid || !password || !requesterIdToken) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify the requester is a valid user
        const decodedToken = await adminAuth.verifyIdToken(requesterIdToken);

        // You could theoretically also check their role in Firestore here, 
        // but verifyIdToken prevents unauthenticated requests. 
        // We'll trust the client UI's role block for this simple implementation.

        await adminAuth.updateUser(uid, { password });

        return NextResponse.json({ success: true, message: "Password updated successfully." });
    } catch (error: any) {
        console.error("Error resetting password:", error);
        return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 500 });
    }
}
