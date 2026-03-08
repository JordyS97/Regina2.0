import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(request: Request) {
    if (!adminAuth || !adminDb) {
        return NextResponse.json({ error: "Firebase Admin SDK is not configured. A FIREBASE_SERVICE_ACCOUNT_KEY is required in .env.local to perform administrative actions." }, { status: 501 });
    }

    try {
        const body = await request.json();
        const { email, password, name, role, dealer, requesterIdToken } = body;

        if (!email || !password || !requesterIdToken) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify the requester
        await adminAuth.verifyIdToken(requesterIdToken);

        // 1. Create the user in Firebase Auth
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName: name,
        });

        // 2. Create the user document in Firestore
        await adminDb.collection("users").doc(userRecord.uid).set({
            email,
            name: name || "New User",
            role: role || "User",
            dealer: dealer || "",
            department: "General"
        });

        return NextResponse.json({
            success: true,
            message: "User created successfully.",
            user: {
                id: userRecord.uid,
                email,
                name,
                role,
                dealer
            }
        });
    } catch (error: any) {
        console.error("Error creating user:", error);
        return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
    }
}
