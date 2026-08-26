import type { BudgetAllocation, BudgetScope, Proposal, ProposalStatus } from './types';

export const BUDGET_COLLECTION = 'budgets';

/** Budgets are set per calendar year; the current one is the default view. */
export function currentBudgetPeriod(): string {
    return String(new Date().getFullYear());
}

/** The last few years plus the next one — enough to plan ahead and look back. */
export function budgetPeriodOptions(): string[] {
    const year = new Date().getFullYear();
    return [year + 1, year, year - 1, year - 2].map(String);
}

/**
 * A stable, readable Firestore document id.
 *
 * Dealer names carry spaces (`H531-SO BIMA`), which are legal in a document id
 * but awkward in a URL and in the console, so they are slugged.
 */
export function budgetDocId(scope: BudgetScope, key: string, period: string): string {
    const prefix = scope === 'Dealer' ? 'dealer' : 'gl';
    const slug = key.replace(/[^A-Za-z0-9-]+/g, '_');
    return `${prefix}__${slug}__${period}`;
}

/** Proposals that are still alive: approved, or somewhere in the chain. */
export function isCommitted(status: ProposalStatus): boolean {
    return status !== 'Rejected';
}

export interface BudgetUsage {
    /** Fully approved, i.e. money already committed. */
    approved: number;
    /** Still moving through the approval chain. */
    pending: number;
    /** approved + pending — what the ceiling actually has to cover. */
    committed: number;
    count: number;
}

const EMPTY_USAGE: BudgetUsage = { approved: 0, pending: 0, committed: 0, count: 0 };

/**
 * Roll proposals up against a budget key.
 *
 * Rejected proposals never consume budget; pending ones do, because a ceiling
 * that only counts approvals lets a dealer queue up twice its allocation and
 * only discover the problem at the last signature.
 */
export function usageFor(proposals: Proposal[], predicate: (p: Proposal) => boolean): BudgetUsage {
    return proposals.filter(predicate).reduce<BudgetUsage>((acc, p) => {
        if (!isCommitted(p.status)) return acc;
        const approved = p.status === 'Approved' ? p.amount : 0;
        const pending = p.status === 'Approved' ? 0 : p.amount;
        return {
            approved: acc.approved + approved,
            pending: acc.pending + pending,
            committed: acc.committed + p.amount,
            count: acc.count + 1,
        };
    }, EMPTY_USAGE);
}

/** Percentage of a ceiling consumed; 0 when no ceiling has been set yet. */
export function utilization(committed: number, total: number): number {
    if (!total || total <= 0) return 0;
    return (committed / total) * 100;
}

export function healthOf(percent: number): 'Sehat' | 'Waspada' | 'Kritis' | 'Melebihi Pagu' {
    if (percent > 100) return 'Melebihi Pagu';
    if (percent > 90) return 'Kritis';
    if (percent > 75) return 'Waspada';
    return 'Sehat';
}

/** Look a ceiling up out of the allocation map, tolerating a missing entry. */
export function allocationFor(
    allocations: Record<string, BudgetAllocation>,
    scope: BudgetScope,
    key: string,
    period: string
): BudgetAllocation | undefined {
    return allocations[budgetDocId(scope, key, period)];
}
