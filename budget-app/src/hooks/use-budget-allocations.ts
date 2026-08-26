'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BUDGET_COLLECTION, budgetDocId } from '@/lib/budget';
import type { BudgetAllocation, BudgetScope } from '@/lib/types';

export interface BudgetAllocationsState {
    /** Keyed by document id, so a lookup never has to scan the list. */
    allocations: Record<string, BudgetAllocation>;
    loading: boolean;
    error: string | null;
    /** True when Firebase is not configured and edits only live in memory. */
    isLocalOnly: boolean;
    saveAllocation: (input: {
        scope: BudgetScope;
        key: string;
        label: string;
        totalBudget: number;
        note?: string;
        updatedBy?: string;
    }) => Promise<void>;
}

/**
 * The budget ceilings for one period, live.
 *
 * Without Firebase the hook still works — edits are held in memory so the
 * screen can be demonstrated — but `isLocalOnly` is set so the page can say
 * plainly that nothing is being persisted.
 */
export function useBudgetAllocations(period: string): BudgetAllocationsState {
    const [store, setStore] = useState<Record<string, BudgetAllocation>>({});
    /** The period the current snapshot belongs to; null until the first arrives. */
    const [loadedPeriod, setLoadedPeriod] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!db) return;

        const budgetQuery = query(collection(db, BUDGET_COLLECTION), where('period', '==', period));

        const unsubscribe = onSnapshot(
            budgetQuery,
            (snapshot) => {
                const next: Record<string, BudgetAllocation> = {};
                snapshot.forEach((docSnap) => {
                    next[docSnap.id] = { id: docSnap.id, ...docSnap.data() } as BudgetAllocation;
                });
                setStore(next);
                setError(null);
                setLoadedPeriod(period);
            },
            (err) => {
                console.error('Error fetching budget allocations:', err);
                setError(err.message);
                setLoadedPeriod(period);
            }
        );

        return () => unsubscribe();
    }, [period]);

    // Loading is derived rather than stored, so switching period never needs a
    // setState in the effect body to flip the flag back on.
    const loading = !!db && loadedPeriod !== period;

    // While a new period's snapshot is in flight the store still holds the old
    // one; filtering by period keeps a stale ceiling from being read as current.
    const allocations = useMemo(() => {
        const scoped: Record<string, BudgetAllocation> = {};
        for (const [id, allocation] of Object.entries(store)) {
            if (allocation.period === period) scoped[id] = allocation;
        }
        return scoped;
    }, [store, period]);

    const saveAllocation = useCallback<BudgetAllocationsState['saveAllocation']>(
        async ({ scope, key, label, totalBudget, note, updatedBy }) => {
            const id = budgetDocId(scope, key, period);
            const record: BudgetAllocation = {
                id,
                scope,
                key,
                label,
                totalBudget,
                period,
                note: note ?? '',
                updatedAt: new Date().toISOString(),
                updatedBy: updatedBy ?? '',
            };

            if (!db) {
                // No backend: keep the edit visible so the screen still works,
                // and let the caller tell the user it is not persisted.
                setStore((prev) => ({ ...prev, [id]: record }));
                return;
            }

            // merge so a later schema addition never wipes an existing field.
            await setDoc(doc(db, BUDGET_COLLECTION, id), record, { merge: true });
        },
        [period]
    );

    return { allocations, loading, error, isLocalOnly: !db, saveAllocation };
}
