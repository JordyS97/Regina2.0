export type Role = 'User' | 'Supervisor' | 'SubDeptHead' | 'FinanceHead' | 'RegionHead' | 'SuperAdmin';

export type ProposalStatus = 'Pending Supervisor' | 'Pending Sub Dept' | 'Pending Finance' | 'Pending Region' | 'Approved' | 'Rejected';

export type ProposalType =
    | 'Peralatan Kantor/ATK'
    | 'Event Dealer (Showroom Event, Yasinan, dll)'
    | 'Memo Internal (AMIC)'
    | 'Pembelian Air Konsumen'
    | 'Sewa Gudang'
    | 'Perbaikan AC / mobil / motor / asset lain'
    | 'Pengajuan Matprom'
    | 'Pembelian Paket Data'
    | 'Lain-lain';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    department: string;
    dealer?: Dealer;
}

export type Dealer =
    | 'H531-SO BIMA'
    | 'H534-SO AMPENAN'
    | 'H535-SO CAKRANEGARA'
    | 'H537-SO SRIWIJAYA'
    | 'H539-SO GERUNG'
    | 'H532-SO PRAYA'
    | 'H538-SO KOPANG'
    | 'H533-SO MASBAGIK'
    | 'H536-SO SUMBAWA';

export interface ItemizedCost {
    id: string;
    item: string;
    qty: number;
    price: number;
    total: number;
    m1?: string;
}

export type BudgetSource = 'GL Account' | 'Added Fee' | 'Retail JoinProm';

/** The label shown in the form, keyed by the value that gets persisted. */
export const BUDGET_SOURCE_LABEL: Record<BudgetSource, string> = {
    'GL Account': 'GL Account',
    'Added Fee': 'Added Fee (Biaya Titipan C6)',
    'Retail JoinProm': 'Retail JoinProm',
};

export interface Proposal {
    id: string;
    /** Human-facing reference, e.g. P20260042. Distinct from the Firestore id. */
    trackingId?: string;
    title: string;
    subtitle?: string;
    background?: string;
    budgetSource?: BudgetSource;
    items?: ItemizedCost[];
    type: ProposalType;
    amount: number;
    glAccountCode: string;
    description: string;
    submitterId: string;
    submitterName?: string;
    submitterDepartment?: string;
    dealer: Dealer;
    status: ProposalStatus;
    dateSubmitted: string;
    lastUpdated: string;
    history: ProposalHistory[];
    attachmentUrl?: string | null;
    skipRegionHeadApproval?: boolean;
}

export interface ProposalHistory {
    date: string;
    action: 'Submitted' | 'Approved' | 'Rejected';
    byUserId: string;
    byRole: Role;
    comment?: string;
}

export interface GLAccount {
    code: string;
    name: string;
    budgetUsed: number;
    budgetRemaining: number;
    totalBudget: number;
}
