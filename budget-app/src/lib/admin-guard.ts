import { adminAuth, adminDb } from './firebase-admin';

export interface GuardFailure {
    error: string;
    status: number;
}

export interface GuardSuccess {
    uid: string;
}

/**
 * Verifies that a request carries a valid ID token AND that the account behind
 * it is a SuperAdmin in Firestore.
 *
 * Checking only the token would let any signed-in employee call these
 * endpoints — enough to create a SuperAdmin account or reset a colleague's
 * password — because the client-side role check is only a UI affordance.
 */
export async function requireSuperAdmin(idToken: string | undefined): Promise<GuardSuccess | GuardFailure> {
    if (!adminAuth || !adminDb) {
        return { error: "Firebase Admin SDK is not configured.", status: 501 };
    }

    if (!idToken) {
        return { error: "Missing authentication token.", status: 401 };
    }

    let uid: string;
    try {
        // checkRevoked so a disabled or signed-out admin cannot keep acting.
        const decoded = await adminAuth.verifyIdToken(idToken, true);
        uid = decoded.uid;
    } catch {
        return { error: "Invalid or expired authentication token.", status: 401 };
    }

    const profile = await adminDb.collection('users').doc(uid).get();
    if (!profile.exists || profile.data()?.role !== 'SuperAdmin') {
        return { error: "Forbidden: this action requires Super Admin privileges.", status: 403 };
    }

    return { uid };
}

export function isGuardFailure(result: GuardSuccess | GuardFailure): result is GuardFailure {
    return 'error' in result;
}
