import type { Proposal, ProposalStatus, Role } from './types';

/** Nomor surat is written with a Roman month, the way the paper form always was. */
export const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'] as const;

/**
 * The human-facing proposal number, e.g. `MMC.001/H534/VIII/2026`.
 *
 * Firestore ids are opaque (`8xKq…`), so the sequence falls back to the last
 * dash-separated segment when there is one and to a short slice of the id when
 * there is not — either way the dealer, month and year stay readable.
 */
export function formatProposalNumber(proposal: Pick<Proposal, 'id' | 'dealer' | 'dateSubmitted' | 'trackingId'>): string {
    const rawSequence = proposal.id.includes('-')
        ? proposal.id.split('-').pop()!
        : proposal.id.slice(-3).toUpperCase();

    const dealerCode = proposal.dealer?.split('-')[0] ?? 'H---';
    const date = new Date(proposal.dateSubmitted);
    const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
    const romanMonth = ROMAN_MONTHS[validDate.getMonth()];

    return `MMC.${rawSequence}/${dealerCode}/${romanMonth}/${validDate.getFullYear()}`;
}

/** Which desk a proposal is currently sitting on. */
export function getBottleneck(status: ProposalStatus): string {
    switch (status) {
        case 'Pending Supervisor': return 'Supervisor';
        case 'Pending Sub Dept': return 'Sub Dept Head';
        case 'Pending Finance': return 'Finance Head';
        case 'Pending Region': return 'Region Head';
        default: return '-';
    }
}

/** Role names as they are spoken in the office, not as they are typed in code. */
export const ROLE_LABEL: Record<Role, string> = {
    User: 'Pengaju',
    Supervisor: 'Supervisor',
    SubDeptHead: 'Sub Dept Head',
    FinanceHead: 'Finance Head',
    RegionHead: 'Region Head',
    SuperAdmin: 'Super Admin',
};

/** Status wording used on screen, so Indonesian copy never drifts per page. */
export const STATUS_LABEL: Record<ProposalStatus, string> = {
    'Pending Supervisor': 'Menunggu Supervisor',
    'Pending Sub Dept': 'Menunggu Sub Dept',
    'Pending Finance': 'Menunggu Finance',
    'Pending Region': 'Menunggu Region',
    Approved: 'Disetujui',
    Rejected: 'Ditolak',
};

export function statusBadgeVariant(status: ProposalStatus): 'success' | 'destructive' | 'warning' {
    if (status === 'Approved') return 'success';
    if (status === 'Rejected') return 'destructive';
    return 'warning';
}

/** Long-form date used in the detail view; short dates stay in the tables. */
export function formatDateTime(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function formatDate(value?: string): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
