'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';

export interface UserDirectory {
    /** Keyed by user id. */
    users: Record<string, User>;
    loading: boolean;
    /** Name for a user id, or undefined when they are no longer in the directory. */
    nameOf: (userId: string) => string | undefined;
}

/**
 * Every user, read once, so a signature can print a person's name rather than
 * the Firestore id sitting in the proposal's history.
 *
 * A deleted user resolves to undefined, and the document falls back to the
 * blank line it would have printed anyway — history keeps the id, but a name
 * nobody can look up is not worth inventing.
 */
export function useUserDirectory(): UserDirectory {
    const [users, setUsers] = useState<Record<string, User>>({});
    const [loading, setLoading] = useState(!!db);

    useEffect(() => {
        if (!db) return;

        let cancelled = false;

        getDocs(collection(db, 'users'))
            .then((snapshot) => {
                if (cancelled) return;
                const next: Record<string, User> = {};
                snapshot.forEach((docSnap) => {
                    next[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as User;
                });
                setUsers(next);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching user directory:', error);
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const nameOf = useCallback((userId: string) => users[userId]?.name, [users]);

    return { users, loading, nameOf };
}
