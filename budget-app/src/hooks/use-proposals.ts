'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MOCK_PROPOSALS } from '@/lib/mock-data';
import type { Proposal } from '@/lib/types';

export interface ProposalsState {
    proposals: Proposal[];
    loading: boolean;
    /** True when Firebase is unreachable and the sample set is standing in. */
    isSample: boolean;
    error: string | null;
}

/** Whether Firebase is configured is known at module load, so the no-backend
 *  case can be the initial state instead of an effect that immediately sets it. */
const INITIAL_STATE: ProposalsState = db
    ? { proposals: [], loading: true, isSample: false, error: null }
    : { proposals: MOCK_PROPOSALS, loading: false, isSample: true, error: null };

/**
 * Live proposals from Firestore, sorted newest-first.
 *
 * The Super Admin screens used to read `MOCK_PROPOSALS` directly while the
 * approvals and dashboard screens read Firestore, so an admin inspecting a
 * proposal was looking at a different set of records than the person who
 * submitted it. One subscription, shared, keeps every screen on the same data.
 *
 * When Firebase is not configured the sample set stands in so the UI is still
 * explorable — but `isSample` is set, and the screens say so out loud rather
 * than passing demo rows off as production data.
 */
export function useProposals(): ProposalsState {
    const [state, setState] = useState<ProposalsState>(INITIAL_STATE);

    useEffect(() => {
        if (!db) return;

        const unsubscribe = onSnapshot(
            collection(db, 'proposals'),
            (snapshot) => {
                const fetched: Proposal[] = [];
                snapshot.forEach((docSnap) => {
                    fetched.push({ id: docSnap.id, ...docSnap.data() } as Proposal);
                });
                fetched.sort(
                    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
                );
                setState({ proposals: fetched, loading: false, isSample: false, error: null });
            },
            (error) => {
                console.error('Error fetching proposals:', error);
                setState({
                    proposals: [],
                    loading: false,
                    isSample: false,
                    error: error.message,
                });
            }
        );

        return () => unsubscribe();
    }, []);

    return state;
}
