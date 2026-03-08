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
    users: User[]; // keeping for fallback/mock UI compatibility
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
                    if (!db) throw new Error("Firestore is not initialized.");
                    // Fetch extended user info directly from Firestore
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        setUser(userDoc.data() as User);
                    } else {
                        // New user, create default profile
                        const isTestingAdmin = firebaseUser.email === 'admin@email.com';
                        const defaultUser = {
                            id: firebaseUser.uid,
                            email: firebaseUser.email || '',
                            name: firebaseUser.displayName || (isTestingAdmin ? 'Super Admin' : firebaseUser.email?.split('@')[0] || 'New User'),
                            role: isTestingAdmin ? 'SuperAdmin' : 'User',
                            department: 'General', // Default department
                        };

                        try {
                            await setDoc(userDocRef, defaultUser);
                        } catch (e) {
                            console.warn("Could not write initial user to Firestore (check rules):", e);
                        }

                        setUser(defaultUser as User);
                    }
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
            await firebaseSignOut(auth);
            setUser(null);
            router.push('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout, users: MOCK_USERS }}>
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
