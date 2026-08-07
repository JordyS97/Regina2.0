import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import { requireSuperAdmin, isGuardFailure } from '@/lib/admin-guard';

export async function POST(request: Request) {
    if (!adminAuth) {
        return NextResponse.json({ error: "Firebase Admin SDK is not configured. A FIREBASE_SERVICE_ACCOUNT_KEY is required in .env.local to perform administrative actions." }, { status: 501 });
    }

    try {
        const body = await request.json();
        const { uid, password, requesterIdToken } = body;

        // The client-side role check is only a UI affordance — enforce it here.
        const guard = await requireSuperAdmin(requesterIdToken);
        if (isGuardFailure(guard)) {
            return NextResponse.json({ error: guard.error }, { status: guard.status });
        }

        if (!uid || !password) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (typeof password !== 'string' || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        await adminAuth.updateUser(uid, { password });

        return NextResponse.json({ success: true, message: "Password updated successfully." });
    } catch (error: any) {
        console.error("Error resetting password:", error);
        return NextResponse.json({ error: error.message || "Failed to reset password" }, { status: 500 });
    }
}
