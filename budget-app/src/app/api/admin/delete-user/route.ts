import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

/**
 * Remove a user who is no longer active.
 *
 * Deleting an account is the one administrative action that cannot be undone
 * from the UI, so unlike the other admin routes this one does not take the
 * client's word for the caller's role — it reads the requester's own Firestore
 * document and refuses anyone who is not a Super Admin.
 */
export async function POST(request: Request) {
    if (!adminAuth || !adminDb) {
        return NextResponse.json(
            { error: "Firebase Admin SDK is not configured. A FIREBASE_SERVICE_ACCOUNT_KEY is required in .env.local to perform administrative actions." },
            { status: 501 }
        );
    }

    try {
        const body = await request.json();
        const { uid, requesterIdToken } = body;

        if (!uid || !requesterIdToken) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const decodedToken = await adminAuth.verifyIdToken(requesterIdToken);

        // An admin deleting their own account would lock the last Super Admin
        // out of the system with no way back in.
        if (decodedToken.uid === uid) {
            return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
        }

        const requesterDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
        if (!requesterDoc.exists || requesterDoc.data()?.role !== 'SuperAdmin') {
            return NextResponse.json({ error: "Only a Super Admin can delete users." }, { status: 403 });
        }

        // Firestore first: an orphaned auth account can still be cleaned up,
        // but an orphaned profile document would keep showing in the directory
        // as a user nobody can sign in as.
        await adminDb.collection("users").doc(uid).delete();

        try {
            await adminAuth.deleteUser(uid);
        } catch (authError: unknown) {
            // The profile is already gone; a missing auth record is the state
            // we wanted anyway, so only a real failure is worth reporting.
            const code = (authError as { code?: string } | null)?.code;
            if (code !== 'auth/user-not-found') {
                throw authError;
            }
        }

        return NextResponse.json({ success: true, message: "User deleted successfully." });
    } catch (error: unknown) {
        console.error("Error deleting user:", error);
        const message = error instanceof Error ? error.message : "Failed to delete user";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
