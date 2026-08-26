import type { Proposal, Role } from './types';

/**
 * One signature column on the printed proposal.
 *
 * The chain in code has five stages (Supervisor sits between the submitter and
 * the Sub Dept Head), but the paper form carries four signatures. `role` is the
 * approval whose history entry fills the column in, so changing who signs where
 * is a change to this list and nothing else.
 */
export interface SignatureSlot {
    /** Wording above the space, e.g. "Dibuat oleh,". */
    action: string;
    /** Job title printed under the name line. */
    title: string;
    /**
     * Which approval fills this column. `Submitted` means the person who
     * raised the proposal, whatever role they hold — a branch head submits as
     * either User or Supervisor depending on how their account is set up.
     */
    filledBy: { kind: 'submitted' } | { kind: 'approved'; role: Role };
}

/** ADH is the administration desk, which this system models as FinanceHead. */
export const SIGNATURE_SLOTS: SignatureSlot[] = [
    { action: 'Dibuat oleh,', title: 'Branch Head', filledBy: { kind: 'submitted' } },
    { action: 'Diperiksa oleh,', title: 'Sub Dept Head', filledBy: { kind: 'approved', role: 'SubDeptHead' } },
    { action: 'Diperiksa oleh,', title: 'ADH', filledBy: { kind: 'approved', role: 'FinanceHead' } },
    { action: 'Disetujui oleh,', title: 'Region Head', filledBy: { kind: 'approved', role: 'RegionHead' } },
];

export interface ResolvedSignature extends SignatureSlot {
    /** True once the matching approval exists in the proposal's history. */
    signed: boolean;
    /** Name of the person who signed, when it can be resolved. */
    name?: string;
    /** ISO date of the signature. */
    date?: string;
}

/**
 * Match each signature column against the proposal's history.
 *
 * A column that is not yet signed still prints — it is the blank space someone
 * signs by hand. A column that has been signed prints the name and date under
 * the line, so a printed sheet doubles as a record of who approved what.
 *
 * The Region Head column is dropped when the Super Admin has waived that stage:
 * a printed form should not carry a space for a signature nobody will give.
 */
export function resolveSignatures(
    proposal: Pick<Proposal, 'history' | 'submitterName' | 'submitterId' | 'skipRegionHeadApproval'>,
    resolveName?: (userId: string) => string | undefined
): ResolvedSignature[] {
    const history = proposal.history ?? [];

    const slots = proposal.skipRegionHeadApproval
        ? SIGNATURE_SLOTS.filter(
            (slot) => !(slot.filledBy.kind === 'approved' && slot.filledBy.role === 'RegionHead')
        )
        : SIGNATURE_SLOTS;

    return slots.map((slot) => {
        // Pulled out of the slot so the narrowing survives into the callback
        // below — a property access on a union does not.
        const filledBy = slot.filledBy;

        const entry = filledBy.kind === 'submitted'
            ? history.find((h) => h.action === 'Submitted')
            : history.find((h) => h.action === 'Approved' && h.byRole === filledBy.role);

        if (!entry) return { ...slot, signed: false };

        const name = filledBy.kind === 'submitted'
            ? proposal.submitterName || resolveName?.(entry.byUserId)
            : resolveName?.(entry.byUserId);

        return { ...slot, signed: true, name, date: entry.date };
    });
}
