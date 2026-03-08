import { User, Proposal, GLAccount, Dealer } from './types';

export const MOCK_USERS: User[] = [
    { id: 'u1', name: 'Alice Smith', email: 'alice@company.com', role: 'User', department: 'Marketing' },
    { id: 'u2', name: 'Bob Johnson', email: 'bob@company.com', role: 'Supervisor', department: 'Marketing' },
    { id: 'u3', name: 'Charlie Davis', email: 'charlie@company.com', role: 'SubDeptHead', department: 'Marketing' },
    { id: 'u4', name: 'Diana Evans', email: 'diana@company.com', role: 'FinanceHead', department: 'Finance' },
    { id: 'u5', name: 'Evan Frank', email: 'evan@company.com', role: 'RegionHead', department: 'Executive' },
    { id: 'u6', name: 'Fiona Green', email: 'admin@company.com', role: 'SuperAdmin', department: 'IT' },
];

export const MOCK_GL_ACCOUNTS: GLAccount[] = [
    { code: '7001000000', name: 'Employee Comp:Honorarium', budgetUsed: 45000000, budgetRemaining: 15000000, totalBudget: 60000000 },
    { code: '7010100000', name: 'Employee Welfare:Sport & Recreation', budgetUsed: 10000000, budgetRemaining: 5000000, totalBudget: 15000000 },
    { code: '7010200000', name: 'Employee Welfare:Cafetaria', budgetUsed: 25000000, budgetRemaining: 25000000, totalBudget: 50000000 },
    { code: '7010301000', name: 'Employee Welfare:First Aid Medical (P3K)', budgetUsed: 8000000, budgetRemaining: 2000000, totalBudget: 10000000 },
    { code: '7011600000', name: 'Employee Welfare:Removal (Biaya Pindah)', budgetUsed: 120000000, budgetRemaining: 30000000, totalBudget: 150000000 },
    { code: '7019900000', name: 'Employee Welfare:Others', budgetUsed: 50000000, budgetRemaining: 50000000, totalBudget: 100000000 },
    { code: '7030300000', name: 'Training & Education:Meeting & Conference', budgetUsed: 20000000, budgetRemaining: 10000000, totalBudget: 30000000 },
    { code: '7030400000', name: 'Training & Education:Book: Magazine: Newspaper', budgetUsed: 5000000, budgetRemaining: 5000000, totalBudget: 10000000 },
    { code: '7030600000', name: 'Training & Education:Training', budgetUsed: 35000000, budgetRemaining: 5000000, totalBudget: 40000000 },
    { code: '7060000000', name: 'Donation', budgetUsed: 0, budgetRemaining: 20000000, totalBudget: 20000000 },
    { code: '7090101000', name: 'Transportation & Travelling:Domestic-Ticket', budgetUsed: 60000000, budgetRemaining: 40000000, totalBudget: 100000000 },
    { code: '7090102000', name: 'Transportation & Travelling:Domestic-Hotel', budgetUsed: 80000000, budgetRemaining: 20000000, totalBudget: 100000000 },
    { code: '7090103000', name: 'Transportation & Travelling:Domestic-Accommodation', budgetUsed: 40000000, budgetRemaining: 10000000, totalBudget: 50000000 },
    { code: '7110200000', name: 'Advertising & Promotion:Sponsorship', budgetUsed: 150000000, budgetRemaining: 50000000, totalBudget: 200000000 },
    { code: '7110900000', name: 'Adv&Promo:Material-Campaign-New Unit', budgetUsed: 80000000, budgetRemaining: 20000000, totalBudget: 100000000 },
    { code: '7110902000', name: 'Adv&Promo:Free Gift-Campaign-New Unit', budgetUsed: 45000000, budgetRemaining: 15000000, totalBudget: 60000000 },
    { code: '7111000000', name: 'Advertising & Promotion:Material-Adv & Promotion', budgetUsed: 25000000, budgetRemaining: 5000000, totalBudget: 30000000 },
    { code: '7111001000', name: 'Advertising & Promotion:Service-Adv & Promotion', budgetUsed: 15000000, budgetRemaining: 15000000, totalBudget: 30000000 },
    { code: '7111002000', name: 'Advertising & Promotion:Free Gift-Adv & Promotion', budgetUsed: 100000000, budgetRemaining: 0, totalBudget: 100000000 },
    { code: '7111100000', name: 'Advertising & Promotion:Material-Enrichment Progra', budgetUsed: 40000000, budgetRemaining: 10000000, totalBudget: 50000000 },
    { code: '7111200000', name: 'Advertising & Promotion:Material-Rel Support & CS', budgetUsed: 35000000, budgetRemaining: 15000000, totalBudget: 50000000 },
    { code: '7120000000', name: 'Repair & Maintenance:Material', budgetUsed: 8000000, budgetRemaining: 4000000, totalBudget: 12000000 },
    { code: '7120001000', name: 'Repair & Maintenance:Service', budgetUsed: 5000000, budgetRemaining: 5000000, totalBudget: 10000000 },
    { code: '7130000000', name: 'Fuel & Lubricant', budgetUsed: 200000000, budgetRemaining: 100000000, totalBudget: 300000000 },
    { code: '7140500000', name: 'Tools & Other Equipment:Office Equipment', budgetUsed: 50000000, budgetRemaining: 0, totalBudget: 50000000 },
    { code: '7140600000', name: 'Tools & Other Equipment:Furniture & Fixture', budgetUsed: 120000000, budgetRemaining: 0, totalBudget: 120000000 },
    { code: '7140700000', name: 'Tools & Other Equipment:Workshop Equipment', budgetUsed: 30000000, budgetRemaining: 10000000, totalBudget: 40000000 },
    { code: '7190200000', name: 'Shipping & Warehousing:Shipping', budgetUsed: 45000000, budgetRemaining: 5000000, totalBudget: 50000000 },
    { code: '7190300000', name: 'Shipping & Warehousing:Warehouse', budgetUsed: 45000000, budgetRemaining: 15000000, totalBudget: 60000000 },
    { code: '7200100000', name: 'Utility & Energy:Electricity', budgetUsed: 10000000, budgetRemaining: 5000000, totalBudget: 15000000 },
    { code: '7200200000', name: 'Utility & Energy:Water', budgetUsed: 25000000, budgetRemaining: 25000000, totalBudget: 50000000 },
    { code: '7210400000', name: 'Communication:Dispatcher', budgetUsed: 8000000, budgetRemaining: 2000000, totalBudget: 10000000 },
    { code: '7210500000', name: 'Communication:Internet & Data Communication', budgetUsed: 120000000, budgetRemaining: 30000000, totalBudget: 150000000 },
    { code: '7219900000', name: 'Communication:Telecommunication', budgetUsed: 50000000, budgetRemaining: 50000000, totalBudget: 100000000 },
    { code: '7220500000', name: 'Office Expense:Administrative', budgetUsed: 20000000, budgetRemaining: 10000000, totalBudget: 30000000 },
    { code: '7220600000', name: 'Office Expense:Office Supplies', budgetUsed: 5000000, budgetRemaining: 5000000, totalBudget: 10000000 },
    { code: '7240100000', name: 'Professional Fees:Legal', budgetUsed: 35000000, budgetRemaining: 5000000, totalBudget: 40000000 },
    { code: '7249900000', name: 'Professional Fees:Others', budgetUsed: 0, budgetRemaining: 20000000, totalBudget: 20000000 },
    { code: '7260000000', name: 'Sales Commission', budgetUsed: 60000000, budgetRemaining: 40000000, totalBudget: 100000000 },
    { code: '7280100000', name: 'Taxes & Licenses:Property Taxes', budgetUsed: 80000000, budgetRemaining: 20000000, totalBudget: 100000000 },
    { code: '7280200000', name: 'Taxes & Licenses:Registration & Retribution', budgetUsed: 40000000, budgetRemaining: 10000000, totalBudget: 50000000 },
    { code: '7280300000', name: 'Taxes & Licenses:Documentary Taxes', budgetUsed: 150000000, budgetRemaining: 50000000, totalBudget: 200000000 },
    { code: '7290300000', name: 'Bank Charges:Bank Administration', budgetUsed: 80000000, budgetRemaining: 20000000, totalBudget: 100000000 },
    { code: '7300200000', name: 'Rent Expense:Warehouse', budgetUsed: 45000000, budgetRemaining: 15000000, totalBudget: 60000000 },
    { code: '7320000000', name: 'Security Expense', budgetUsed: 25000000, budgetRemaining: 5000000, totalBudget: 30000000 },
    { code: '7340000000', name: 'Predelivery Inspection', budgetUsed: 15000000, budgetRemaining: 15000000, totalBudget: 30000000 },
    { code: '7420100000', name: 'Non-Bank Charges - Transaction', budgetUsed: 100000000, budgetRemaining: 0, totalBudget: 100000000 }
];

export const MOCK_DEALERS: Dealer[] = [
    'H531-SO BIMA',
    'H534-SO AMPENAN',
    'H535-SO CAKRANEGARA',
    'H537-SO SRIWIJAYA',
    'H539-SO GERUNG',
    'H532-SO PRAYA',
    'H538-SO KOPANG',
    'H533-SO MASBAGIK',
    'H536-SO SUMBAWA'
];

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

const lastMonth = new Date(today);
lastMonth.setMonth(today.getMonth() - 1);

const twoMonthsAgo = new Date(today);
twoMonthsAgo.setMonth(today.getMonth() - 2);

const sixMonthsAgo = new Date(today);
sixMonthsAgo.setMonth(today.getMonth() - 6);

const lastYear1 = new Date(today);
lastYear1.setFullYear(today.getFullYear() - 1);
lastYear1.setMonth(3); // April last year

const lastYear2 = new Date(today);
lastYear2.setFullYear(today.getFullYear() - 1);
lastYear2.setMonth(8); // September last year

export const MOCK_PROPOSALS: Proposal[] = [
    {
        id: 'PROP-2024-001',
        title: 'Q3 Digital Ad Campaign',
        type: 'Local Event',
        amount: 150000000,
        glAccountCode: '7110900000', // Adv&Promo:Material-Campaign-New Unit
        description: 'Funding for Google and Meta Ads for the Q3 product launch in the APAC region.',
        submitterId: 'u1',
        dealer: 'H531-SO BIMA',
        status: 'Pending Supervisor',
        dateSubmitted: today.toISOString(),
        lastUpdated: today.toISOString(),
        history: [
            {
                date: today.toISOString(),
                action: 'Submitted',
                byUserId: 'u1',
                byRole: 'User',
            }
        ]
    },
    {
        id: 'PROP-2024-002',
        title: 'Annual Tech Conference Sponsorship',
        type: 'Exhibition',
        amount: 250000000,
        glAccountCode: '7090101000', // Transportation & Travelling:Domestic-Ticket
        description: 'Platinum sponsorship for the upcoming DevCon, including a large booth and speaking slot.',
        submitterId: 'u1',
        dealer: 'H534-SO AMPENAN',
        status: 'Pending Finance',
        dateSubmitted: twoDaysAgo.toISOString(),
        lastUpdated: yesterday.toISOString(),
        history: [
            { date: twoDaysAgo.toISOString(), action: 'Submitted', byUserId: 'u1', byRole: 'User' },
            { date: yesterday.toISOString(), action: 'Approved', byUserId: 'u2', byRole: 'Supervisor', comment: 'Looks good. This will give us great visibility.' },
            { date: yesterday.toISOString(), action: 'Approved', byUserId: 'u3', byRole: 'SubDeptHead', comment: 'Approved for finance review.' }
        ]
    },
    {
        id: 'PROP-2024-003',
        title: 'New Developer Laptops',
        type: 'Asset Repair',
        amount: 320000000,
        glAccountCode: '7140600000', // Tools & Other Equipment:Furniture & Fixture
        description: 'Replacement of 10 laptops for the engineering team.',
        submitterId: 'u1',
        dealer: 'H535-SO CAKRANEGARA',
        status: 'Approved',
        dateSubmitted: twoMonthsAgo.toISOString(),
        lastUpdated: today.toISOString(),
        history: [
            { date: twoMonthsAgo.toISOString(), action: 'Submitted', byUserId: 'u1', byRole: 'User' },
            { date: twoMonthsAgo.toISOString(), action: 'Approved', byUserId: 'u2', byRole: 'Supervisor' },
            { date: lastMonth.toISOString(), action: 'Approved', byUserId: 'u3', byRole: 'SubDeptHead' },
            { date: lastMonth.toISOString(), action: 'Approved', byUserId: 'u4', byRole: 'FinanceHead' },
            { date: today.toISOString(), action: 'Approved', byUserId: 'u5', byRole: 'RegionHead', comment: 'Approved. Essential for productivity.' },
        ]
    },
    {
        id: 'PROP-2024-004',
        title: 'Stationery Restock Q3',
        type: 'Stationary',
        amount: 12000000,
        glAccountCode: '7220500000', // Office Expense:Administrative
        description: 'Bulk order of pens, notepads, and printer ink.',
        submitterId: 'u1',
        dealer: 'H537-SO SRIWIJAYA',
        status: 'Rejected',
        dateSubmitted: lastMonth.toISOString(),
        lastUpdated: lastMonth.toISOString(),
        history: [
            { date: lastMonth.toISOString(), action: 'Submitted', byUserId: 'u1', byRole: 'User' },
            { date: lastMonth.toISOString(), action: 'Rejected', byUserId: 'u2', byRole: 'Supervisor', comment: 'We still have plenty in the storage room. Please check inventory first.' },
        ]
    },
    {
        id: 'PROP-2024-005',
        title: 'Branch Office Renovation',
        type: 'Asset Repair',
        amount: 85000000,
        glAccountCode: '7120000000', // Repair & Maintenance:Material
        description: 'Painting and minor repairs for the main customer lobby.',
        submitterId: 'u1',
        dealer: 'H539-SO GERUNG',
        status: 'Approved',
        dateSubmitted: sixMonthsAgo.toISOString(),
        lastUpdated: sixMonthsAgo.toISOString(),
        history: [
            { date: sixMonthsAgo.toISOString(), action: 'Submitted', byUserId: 'u1', byRole: 'User' },
            { date: sixMonthsAgo.toISOString(), action: 'Approved', byUserId: 'u2', byRole: 'Supervisor' },
            { date: sixMonthsAgo.toISOString(), action: 'Approved', byUserId: 'u3', byRole: 'SubDeptHead' },
            { date: sixMonthsAgo.toISOString(), action: 'Approved', byUserId: 'u4', byRole: 'FinanceHead' },
            { date: sixMonthsAgo.toISOString(), action: 'Approved', byUserId: 'u5', byRole: 'RegionHead' },
        ]
    },
    {
        id: 'PROP-2023-001',
        title: 'Year End Bonus Campaign',
        type: 'Internal Memo',
        amount: 50000000,
        glAccountCode: '7001000000', // Employee Comp:Honorarium
        description: 'End of year sales incentives.',
        submitterId: 'u1',
        dealer: 'H532-SO PRAYA',
        status: 'Approved',
        dateSubmitted: lastYear1.toISOString(),
        lastUpdated: lastYear1.toISOString(),
        history: [
            { date: lastYear1.toISOString(), action: 'Submitted', byUserId: 'u1', byRole: 'User' },
            { date: lastYear1.toISOString(), action: 'Approved', byUserId: 'u5', byRole: 'RegionHead' },
        ]
    },
    {
        id: 'PROP-2023-002',
        title: 'Regional Ad Campaign',
        type: 'Local Event',
        amount: 95000000,
        glAccountCode: '7111000000', // Advertising & Promotion:Material-Adv & Promotion
        description: 'Advertising promotional materials.',
        submitterId: 'u1',
        dealer: 'H538-SO KOPANG',
        status: 'Approved',
        dateSubmitted: lastYear2.toISOString(),
        lastUpdated: lastYear2.toISOString(),
        history: [
            { date: lastYear2.toISOString(), action: 'Submitted', byUserId: 'u1', byRole: 'User' },
            { date: lastYear2.toISOString(), action: 'Approved', byUserId: 'u5', byRole: 'RegionHead' },
        ]
    }
];
