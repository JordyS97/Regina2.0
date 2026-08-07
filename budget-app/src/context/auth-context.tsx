'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User, Role } from '@/lib/types';
import { MOCK_USERS } from '@/lib/mock-data';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    logout: () => Promise<void>;
    /** Re-reads the profile document, e.g. after the user edits it. */
    refreshUser: () => Promise<void>;
    users: User[]; // keeping for fallback/mock UI compatibility
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Bootstrap escape hatch: the very first sign-in with this address is granted
 * SuperAdmin so the directory can be seeded. Leave it unset in production —
 * every other account is created by a Super Admin through User Management.
 */
const BOOTSTRAP_ADMIN_EMAIL = process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAIL?.toLowerCase();

/** Reads the Firestore profile for a signed-in account, creating it on first login. */
async function loadProfile(firebaseUser: { uid: string; email: string | null; displayName: string | null }): Promise<User | null> {
    if (!db) throw new Error("Firestore is not initialized.");

    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
        // The document id is the source of truth for the user id.
        return { ...(userDoc.data() as User), id: firebaseUser.uid };
    }

    const email = firebaseUser.email || '';
    const isBootstrapAdmin = !!BOOTSTRAP_ADMIN_EMAIL && email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;
    const defaultUser: User = {
        id: firebaseUser.uid,
        email,
        name: firebaseUser.displayName || email.split('@')[0] || 'New User',
        role: isBootstrapAdmin ? 'SuperAdmin' : 'User',
        department: 'General',
    };

    try {
        await setDoc(userDocRef, defaultUser);
    } catch (e) {
        console.warn("Could not write initial user to Firestore (check rules):", e);
    }

    return defaultUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!auth || !db) {
            // Firebase not initialized yet
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
            if (firebaseUser) {
                try {
                    setUser(await loadProfile(firebaseUser));
                } catch (error) {
                    console.error("Error fetching user data from Firestore:", error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const refreshUser = async () => {
        if (!auth?.currentUser) return;
        try {
            setUser(await loadProfile(auth.currentUser));
        } catch (error) {
            console.error("Error refreshing user profile:", error);
        }
    };

    useEffect(() => {
        if (!loading) {
            if (!user && pathname !== '/login') {
                router.replace('/login');
            } else if (user && pathname === '/login') {
                router.replace('/dashboard');
            }
        }
    }, [user, loading, pathname, router]);

    const logout = async () => {
        if (auth) {
            try {
                // Instantly clear local state to trigger the redirect logic
                setUser(null);
                setLoading(true); // Temporarily mask the UI during signout

                await firebaseSignOut(auth);
                // After successful signout, Firebase removes tokens from storage.
                // Redirect securely to login.
                router.replace('/login');
            } catch (error) {
                console.error("Signout Error:", error);
            } finally {
                setLoading(false);
            }
        } else {
            // Fallback for mocked cases
            setUser(null);
            router.replace('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, refreshUser, users: MOCK_USERS }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
