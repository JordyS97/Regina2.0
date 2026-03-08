export type Role = 'User' | 'Supervisor' | 'SubDeptHead' | 'FinanceHead' | 'RegionHead' | 'SuperAdmin';

export type ProposalStatus = 'Pending Supervisor' | 'Pending Sub Dept' | 'Pending Finance' | 'Pending Region' | 'Approved' | 'Rejected';

export type ProposalType = 'Stationary' | 'Local Event' | 'Exhibition' | 'Asset Repair' | 'Internal Memo';

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

export interface Proposal {
    id: string;
    title: string;
    type: ProposalType;
    amount: number;
    glAccountCode: string;
    description: string;
    submitterId: string;
    dealer: Dealer;
    status: ProposalStatus;
    dateSubmitted: string;
    lastUpdated: string;
    history: ProposalHistory[];
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
