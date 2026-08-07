import type { DocumentData } from 'firebase/firestore';
import { Proposal, ProposalHistory, ProposalStatus, Role, User } from './types';

/**
 * Single source of truth for the proposal workflow.
 *
 * Every page (submission, approvals, dashboards, tracking) reads and writes
 * proposals through these helpers so the approval chain, the visibility rules
 * and the stored document shape can never drift apart again.
 */

/** The approval chain, in order. A proposal walks it from top to bottom. */
export const APPROVAL_CHAIN: { status: ProposalStatus; role: Role; label: string }[] = [
    { status: 'Pending Supervisor', role: 'Supervisor', label: 'Supervisor Level' },
    { status: 'Pending Sub Dept', role: 'SubDeptHead', label: 'Sub-Department Head' },
    { status: 'Pending Finance', role: 'FinanceHead', label: 'Finance Head' },
    { status: 'Pending Region', role: 'RegionHead', label: 'Region Head' },
];

/** Roles that review proposals rather than raise them. */
export const APPROVER_ROLES: Role[] = ['Supervisor', 'SubDeptHead', 'FinanceHead', 'RegionHead'];

/** Roles allowed to raise a proposal. */
export const SUBMITTER_ROLES: Role[] = ['User', 'Supervisor'];

export function isPending(status: ProposalStatus): boolean {
    return status !== 'Approved' && status !== 'Rejected';
}

/** The status a proposal starts at, given who raised it (a Supervisor never queues to themselves). */
export function initialStatus(submitterRole: Role): ProposalStatus {
    return submitterRole === 'Supervisor' ? 'Pending Sub Dept' : 'Pending Supervisor';
}

/** The stage an approver of this role is responsible for. */
export function stageForRole(role: Role): ProposalStatus | null {
    return APPROVAL_CHAIN.find(step => step.role === role)?.status ?? null;
}

/** Which desk a pending proposal is sitting on, for bottleneck reporting. */
export function bottleneckLabel(status: ProposalStatus): string {
    return APPROVAL_CHAIN.find(step => step.status === status)?.label ?? '-';
}

/**
 * Where a proposal goes after the current stage approves it.
 * Honours the SuperAdmin's per-proposal Region Head bypass.
 */
export function nextStatus(proposal: Pick<Proposal, 'status' | 'skipRegionHeadApproval'>): ProposalStatus {
    const index = APPROVAL_CHAIN.findIndex(step => step.status === proposal.status);
    if (index === -1) return proposal.status;

    for (let i = index + 1; i < APPROVAL_CHAIN.length; i++) {
        const step = APPROVAL_CHAIN[i];
        if (step.role === 'RegionHead' && proposal.skipRegionHeadApproval) continue;
        return step.status;
    }
    return 'Approved';
}

/** True when this user is the one the proposal is currently waiting on. */
export function canActOn(proposal: Proposal, user: User): boolean {
    if (!isPending(proposal.status)) return false;
    if (user.role === 'SuperAdmin' || user.role === 'User') return false;
    // Nobody signs off their own request, whatever their role.
    if (proposal.submitterId === user.id) return false;
    return stageForRole(user.role) === proposal.status;
}

/** Proposals this user is entitled to see at all. */
export function visibleProposals(proposals: Proposal[], user: User): Proposal[] {
    if (user.role === 'SuperAdmin') return proposals;
    if (user.role === 'User') return proposals.filter(p => p.submitterId === user.id);

    const stage = stageForRole(user.role);
    return proposals.filter(p =>
        p.submitterId === user.id ||
        (isPending(p.status) && p.status === stage) ||
        (p.history ?? []).some(h => h.byUserId === user.id)
    );
}

/** Proposals waiting on this user right now. */
export function actionQueue(proposals: Proposal[], user: User): Proposal[] {
    return proposals.filter(p => canActOn(p, user));
}

/** Everything else the user can see: their own requests plus files they already touched. */
export function historyQueue(proposals: Proposal[], user: User): Proposal[] {
    const queueIds = new Set(actionQueue(proposals, user).map(p => p.id));
    return proposals.filter(p => !queueIds.has(p.id));
}

export function buildHistoryEntry(
    action: ProposalHistory['action'],
    user: User,
    comment?: string
): ProposalHistory {
    const entry: ProposalHistory = {
        date: new Date().toISOString(),
        action,
        byUserId: user.id,
        byRole: user.role,
    };
    // Firestore rejects undefined values, so only attach a comment when there is one.
    if (comment && comment.trim()) entry.comment = comment.trim();
    return entry;
}

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** Corporate reference number, e.g. MMC.0431/H534/VIII/2026. */
export function buildTrackingId(dealer: string, sequence: string, date = new Date()): string {
    const dealerCode = (dealer || '').split('-')[0] || 'XXXX';
    return `MMC.${sequence}/${dealerCode}/${ROMAN_MONTHS[date.getMonth()]}/${date.getFullYear()}`;
}

/** Reference shown in lists — stored id first, falling back to a derived one for legacy docs. */
export function displayTrackingId(proposal: Proposal): string {
    if (proposal.trackingId) return proposal.trackingId;
    const sequence = (proposal.id.split('-').pop() ?? proposal.id).slice(-4).toUpperCase();
    const date = toDate(proposal.dateSubmitted) ?? new Date();
    return buildTrackingId(proposal.dealer ?? '', sequence, date);
}

/** Tolerant date parsing: ISO strings, Firestore Timestamps and millisecond numbers. */
export function toDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'object' && typeof (value as { toDate?: unknown }).toDate === 'function') {
        const converted = (value as { toDate: () => Date }).toDate();
        return isNaN(converted.getTime()) ? null : converted;
    }
    if (typeof value === 'object' && typeof (value as { seconds?: unknown }).seconds === 'number') {
        return new Date((value as { seconds: number }).seconds * 1000);
    }
    const parsed = new Date(value as string | number);
    return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: unknown, fallback = '-'): string {
    const date = toDate(value);
    return date ? date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : fallback;
}

function toIsoString(value: unknown): string {
    return toDate(value)?.toISOString() ?? '';
}

/** A history entry as stored: either the current shape or the pre-unification one. */
interface RawHistoryEntry {
    date?: unknown;
    action?: ProposalHistory['action'];
    byUserId?: string;
    byRole?: Role;
    comment?: string;
    /** Legacy fields. */
    status?: string;
    actor?: { id?: string; name?: string; role?: Role };
}

/**
 * Reads a raw Firestore document into a `Proposal`.
 *
 * Documents written before the schema was unified used `submittedBy`,
 * `createdAt` and a different history shape; they are mapped here instead of
 * being dropped so existing data keeps rendering.
 */
export function normalizeProposal(id: string, raw: DocumentData): Proposal {
    const legacySubmitter = raw.submittedBy ?? {};
    const dateSubmitted =
        toIsoString(raw.dateSubmitted) ||
        toIsoString(raw.createdAt) ||
        toIsoString(raw.history?.[0]?.date);

    const history: ProposalHistory[] = (raw.history ?? []).map((entry: RawHistoryEntry) => {
        if (entry?.action) {
            return {
                date: toIsoString(entry.date),
                action: entry.action,
                byUserId: entry.byUserId ?? '',
                byRole: entry.byRole ?? 'User',
                ...(entry.comment ? { comment: entry.comment } : {}),
            } as ProposalHistory;
        }
        // Legacy shape: { status, date, actor: { id, name, role } }
        return {
            date: toIsoString(entry?.date),
            action: entry?.status === 'Rejected' ? 'Rejected' : 'Submitted',
            byUserId: entry?.actor?.id ?? '',
            byRole: entry?.actor?.role ?? 'User',
            ...(entry?.comment ? { comment: entry.comment } : {}),
        } as ProposalHistory;
    });

    return {
        ...raw,
        id,
        trackingId: raw.trackingId ?? undefined,
        title: raw.title ?? '(Tanpa Judul)',
        amount: Number(raw.amount) || 0,
        glAccountCode: raw.glAccountCode ?? '',
        submitterId: raw.submitterId ?? legacySubmitter.id ?? '',
        submitterName: raw.submitterName ?? legacySubmitter.name ?? '',
        department: raw.department ?? legacySubmitter.department ?? '',
        dealer: raw.dealer,
        status: raw.status ?? 'Pending Supervisor',
        dateSubmitted,
        lastUpdated: toIsoString(raw.lastUpdated) || dateSubmitted,
        history,
        items: raw.items ?? [],
    } as Proposal;
}

/** Sorted newest-first on last activity, with undated docs pushed to the end. */
export function sortByRecent(proposals: Proposal[]): Proposal[] {
    return [...proposals].sort((a, b) => {
        const aTime = toDate(a.lastUpdated)?.getTime() ?? toDate(a.dateSubmitted)?.getTime() ?? 0;
        const bTime = toDate(b.lastUpdated)?.getTime() ?? toDate(b.dateSubmitted)?.getTime() ?? 0;
        return bTime - aTime;
    });
}

/** Money that is actually committed against the budget: approved, or still in flight. */
export function committedAmount(proposals: Proposal[]): number {
    return proposals
        .filter(p => p.status !== 'Rejected')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

export function approvedAmount(proposals: Proposal[]): number {
    return proposals
        .filter(p => p.status === 'Approved')
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}
