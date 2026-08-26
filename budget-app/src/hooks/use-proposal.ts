'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MOCK_PROPOSALS } from '@/lib/mock-data';
import type { Proposal } from '@/lib/types';

export interface ProposalState {
    proposal: Proposal | null;
    loading: boolean;
    error: string | null;
}

/**
 * Whether Firebase is configured is known synchronously, so the no-backend case
 * is the initial state rather than an effect that immediately overwrites it.
 */
function initialState(id: string): ProposalState {
    if (db) return { proposal: null, loading: true, error: null };

    const sample = MOCK_PROPOSALS.find((p) => p.id === id) ?? null;
    return {
        proposal: sample,
        loading: false,
        error: sample ? null : 'Proposal tidak ditemukan.',
    };
}

/** One proposal, read once by id — enough to render it as a document. */
export function useProposal(id: string): ProposalState {
    const [state, setState] = useState<ProposalState>(() => initialState(id));

    useEffect(() => {
        if (!db) return;

        let cancelled = false;

        getDoc(doc(db, 'proposals', id))
            .then((snapshot) => {
                if (cancelled) return;
                setState(
                    snapshot.exists()
                        ? { proposal: { id: snapshot.id, ...snapshot.data() } as Proposal, loading: false, error: null }
                        : { proposal: null, loading: false, error: 'Proposal tidak ditemukan.' }
                );
            })
            .catch((err) => {
                console.error('Error loading proposal:', err);
                if (cancelled) return;
                setState({
                    proposal: null,
                    loading: false,
                    error: err instanceof Error ? err.message : 'Gagal memuat proposal.',
                });
            });

        return () => {
            cancelled = true;
        };
    }, [id]);

    return state;
}
