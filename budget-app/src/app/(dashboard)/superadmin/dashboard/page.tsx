'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import { MOCK_GL_ACCOUNTS, MOCK_DEALERS } from '@/lib/mock-data';
import { Proposal } from '@/lib/types';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import {
    DownloadCloud, TrendingUp, DollarSign, Activity, FilterX,
    Globe, Users, FileCheck, AlertTriangle
} from 'lucide-react';
import { formatCurrency, downloadCsv, shortenDealer, glAxisLabels } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import {
    approvedAmount,
    committedAmount,
    displayTrackingId,
    formatDate,
    isPending,
    normalizeProposal,
    toDate,
} from '@/lib/proposals';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

/** Bars that still read clearly inside the fixed-height category card. */
const TOP_CATEGORY_LIMIT = 8;

export default function SuperAdminDashboardPage() {
    const { user } = useAuth();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters State
    const [selectedDealer, setSelectedDealer] = useState<string>('All');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    useEffect(() => {
        if (!db) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(collection(db, 'proposals'), (snapshot) => {
            setProposals(snapshot.docs.map(d => normalizeProposal(d.id, d.data())));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching proposals:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Derived Data
    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            const submitted = toDate(p.dateSubmitted);
            if (selectedDealer !== 'All' && p.dealer !== selectedDealer) return false;
            if (dateFrom && (!submitted || submitted < new Date(dateFrom))) return false;
            if (dateTo && (!submitted || submitted > new Date(`${dateTo}T23:59:59`))) return false;
            return true;
        });
    }, [proposals, selectedDealer, dateFrom, dateTo]);

    if (!user || user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Access Restricted. Super Admins only.</div>
            </div>
        );
    }

    const handleDownload = () => {
        downloadCsv(
            `regina-enterprise-${new Date().toISOString().slice(0, 10)}.csv`,
            ['No. Proposal', 'Judul', 'Tipe', 'Dealer', 'Pengaju', 'Sumber Budget', 'G/L Account', 'Nilai (Rp)', 'Status', 'Tanggal Pengajuan'],
            filteredProposals.map(p => [
                displayTrackingId(p),
                p.title,
                p.type ?? '',
                p.dealer ?? '',
                p.submitterName ?? p.submitterId,
                p.budgetSource ?? '',
                p.glAccountCode ?? '',
                p.amount,
                p.status,
                formatDate(p.dateSubmitted),
            ])
        );
    };

    const clearFilters = () => {
        setSelectedDealer('All');
        setDateFrom('');
        setDateTo('');
    };

    // Enterprise KPI Calculations
    const enterpriseTotalBudget = MOCK_GL_ACCOUNTS.reduce((sum, acc) => sum + acc.totalBudget, 0);
    const totalBudget = selectedDealer === 'All' ? enterpriseTotalBudget : enterpriseTotalBudget / MOCK_DEALERS.length;
    // Rejected proposals never consume budget; approved and in-flight ones do.
    const totalUsed = committedAmount(filteredProposals);
    const totalApproved = approvedAmount(filteredProposals);
    const totalRemaining = Math.max(0, totalBudget - totalUsed);
    const utilizedPercentage = totalBudget > 0 ? ((totalUsed / totalBudget) * 100).toFixed(1) : '0.0';

    const totalProposals = filteredProposals.length;
    const approvedCount = filteredProposals.filter(p => p.status === 'Approved').length;
    const pendingCount = filteredProposals.filter(p => isPending(p.status)).length;
    const rejectedCount = filteredProposals.filter(p => p.status === 'Rejected').length;

    // 1. Monthly Trends (Line Chart) — undated docs are skipped rather than
    // collapsing into an "Invalid Date" bucket.
    const monthlyDataMap = filteredProposals.reduce((acc, p) => {
        const date = toDate(p.dateSubmitted);
        if (!date) return acc;
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        acc[monthYear] = (acc[monthYear] || 0) + p.amount;
        return acc;
    }, {} as Record<string, number>);

    const monthlyData = Object.keys(monthlyDataMap).map(key => ({
        name: key,
        Amount: monthlyDataMap[key],
        timestamp: new Date(`1 ${key}`).getTime()
    })).sort((a, b) => a.timestamp - b.timestamp);

    // 2. Yearly (Column Chart)
    const yearlyDataMap = filteredProposals.reduce((acc, p) => {
        const date = toDate(p.dateSubmitted);
        if (!date) return acc;
        const year = date.getFullYear().toString();
        acc[year] = (acc[year] || 0) + p.amount;
        return acc;
    }, {} as Record<string, number>);

    const yearlyData = Object.keys(yearlyDataMap).map(key => ({
        name: key,
        Amount: yearlyDataMap[key]
    })).sort((a, b) => Number(a.name) - Number(b.name));

    // 3. Spending Categories (Sorted Bar Chart)
    const spendingDataMap = filteredProposals.reduce((acc, p) => {
        const glName = MOCK_GL_ACCOUNTS.find(g => g.code === p.glAccountCode)?.name || 'UNKNOWN';
        acc[glName] = (acc[glName] || 0) + p.amount;
        return acc;
    }, {} as Record<string, number>);

    const spendingData = Object.keys(spendingDataMap).map(key => ({
        name: key,
        Amount: spendingDataMap[key]
    })).sort((a, b) => b.Amount - a.Amount);

    // The card is a fixed 350px tall — past this many bars they compress into an
    // unreadable stack, so show the ranking's head and say so in the subtitle.
    // Axis labels are shortened to distinct forms; the tooltip keeps the full name.
    const topSpendingRows = spendingData.slice(0, TOP_CATEGORY_LIMIT);
    const topSpendingLabels = glAxisLabels(topSpendingRows.map(row => row.name));
    const topSpendingData = topSpendingRows.map((row, i) => ({
        ...row,
        label: topSpendingLabels[i],
        fullName: row.name,
    }));

    // 4. Dealer Distribution (Donut Chart)
    const dealerDataMap = filteredProposals.reduce((acc, p) => {
        acc[p.dealer] = (acc[p.dealer] || 0) + p.amount;
        return acc;
    }, {} as Record<string, number>);

    const dealerData = Object.keys(dealerDataMap).map(key => ({
        name: key,
        value: dealerDataMap[key]
    })).sort((a, b) => b.value - a.value);

    // 5. Status Breakdown (for mini donut)
    const statusData = [
        { name: 'Approved', value: approvedCount, color: '#10b981' },
        { name: 'Pending', value: pendingCount, color: '#f59e0b' },
        { name: 'Rejected', value: rejectedCount, color: '#ef4444' },
    ].filter(d => d.value > 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-slate-200 p-3 shadow-md rounded-lg text-sm z-50">
                    {/* Axis labels are shortened, so show the row's full name when it has one. */}
                    {(payload[0].payload?.fullName || label) && (
                        <p className="font-semibold text-slate-800 mb-1">{payload[0].payload?.fullName || label}</p>
                    )}
                    {!label && !payload[0].payload?.fullName && payload[0].name && (
                        <p className="font-semibold text-slate-800 mb-1">{payload[0].name}</p>
                    )}
                    <p className="text-slate-600">{formatCurrency(payload[0].value)}</p>
                </div>
            );
        }
        return null;
    };

    const CountTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-slate-200 p-3 shadow-md rounded-lg text-sm z-50">
                    <p className="font-semibold text-slate-800 mb-1">{payload[0].name}</p>
                    <p className="text-slate-600">{payload[0].value} proposal(s)</p>
                </div>
            );
        }
        return null;
    };

    const yAxisFormatter = (val: number) => {
        if (val >= 1000000000) return `Rp${(val / 1000000000).toFixed(1)}B`;
        if (val >= 1000000) return `Rp${(val / 1000000).toFixed(1)}M`;
        return `Rp${val}`;
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Globe className="h-8 w-8 text-blue-600" />
                        Enterprise Dashboard
                    </h2>
                    <p className="text-slate-500 mt-1">
                        {loading
                            ? 'Memuat data proposal...'
                            : `Bird's-eye view of all budget activity across the organization (${proposals.length} proposal).`}
                    </p>
                </div>
                <Button
                    onClick={handleDownload}
                    disabled={filteredProposals.length === 0}
                    className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800"
                >
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Export Report (CSV)
                </Button>
            </div>

            {/* Global Filters */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Dealer Branch</label>
                            <Select
                                value={selectedDealer}
                                onChange={(e) => setSelectedDealer(e.target.value)}
                                className="w-full bg-white"
                                options={[
                                    { label: "All Dealers (Enterprise)", value: "All" },
                                    ...MOCK_DEALERS.map(dealer => ({ label: dealer, value: dealer }))
                                ]}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Date From</label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-white" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Date To</label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-white" />
                        </div>
                        <div className="flex-none">
                            <Button variant="outline" onClick={clearFilters} className="w-full md:w-auto h-[40px]">
                                <FilterX className="h-4 w-4 mr-2" />
                                Clear
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards Row 1: Financial */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-slate-900 text-white border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Enterprise Budget</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
                        <p className="text-xs text-slate-400 mt-1">{MOCK_GL_ACCOUNTS.length} G/L accounts active</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-600 text-white border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-200">Budget Consumed</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalUsed)}</div>
                        <p className="text-xs text-blue-200 mt-1">
                            {formatCurrency(totalApproved)} approved • {utilizedPercentage}% utilization
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-600 text-white border-none shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-200">Remaining Budget</CardTitle>
                        <Activity className="h-4 w-4 text-emerald-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalRemaining)}</div>
                        <p className="text-xs text-emerald-200 mt-1">Available capacity</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Utilization</CardTitle>
                        <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{utilizedPercentage}%</div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 mt-2">
                            <div
                                className={`h-2.5 rounded-full transition-all ${Number(utilizedPercentage) > 80 ? 'bg-red-500' : Number(utilizedPercentage) > 60 ? 'bg-amber-500' : 'bg-blue-600'}`}
                                style={{ width: `${Math.min(100, Number(utilizedPercentage))}%` }}
                            ></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* KPI Cards Row 2: Operational */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Proposals</CardTitle>
                        <FileCheck className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{totalProposals}</div>
                        <p className="text-xs text-slate-500 mt-1">In current filter scope</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Approved</CardTitle>
                        <FileCheck className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
                        <p className="text-xs text-slate-500 mt-1">{totalProposals > 0 ? ((approvedCount / totalProposals) * 100).toFixed(0) : 0}% approval rate</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Pending Review</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
                        <p className="text-xs text-slate-500 mt-1">Awaiting approval chain</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Rejected</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                        <p className="text-xs text-slate-500 mt-1">{totalProposals > 0 ? ((rejectedCount / totalProposals) * 100).toFixed(0) : 0}% rejection rate</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1: Monthly Trends & Yearly */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Monthly Submission Trends</CardTitle>
                        <CardDescription>Enterprise-wide timeline of budget proposals.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                    <Line type="monotone" dataKey="Amount" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No data for selected filters.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Yearly Comparison</CardTitle>
                        <CardDescription>Year-over-year spending comparison.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {yearlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="Amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No data for selected filters.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2: Spending Categories & Dealer Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Top Spending Categories</CardTitle>
                        <CardDescription>
                            {spendingData.length > TOP_CATEGORY_LIMIT
                                ? `${TOP_CATEGORY_LIMIT} G/L account teratas dari ${spendingData.length} yang terpakai.`
                                : 'G/L account expenditure ranked highest to lowest.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {spendingData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                {/* YAxis.width reserves the label gutter; margin.left cannot do
                                    that job, which is why long G/L names used to spill out. */}
                                <BarChart data={topSpendingData} layout="vertical" margin={{ top: 10, right: 40, left: 8, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <YAxis
                                        type="category"
                                        dataKey="label"
                                        axisLine={false}
                                        tickLine={false}
                                        width={170}
                                        interval={0}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="Amount" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={18} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No data for selected filters.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Dealer Distribution</CardTitle>
                        <CardDescription>Budget usage per dealer branch.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {dealerData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={dealerData}
                                        cx="50%"
                                        cy="42%"
                                        innerRadius={52}
                                        outerRadius={86}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {dealerData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    {/* Nine branches wrap to ~3 rows; reserve that height so the
                                        legend shrinks the donut instead of escaping the card. */}
                                    <Legend
                                        verticalAlign="bottom"
                                        height={92}
                                        iconType="circle"
                                        iconSize={8}
                                        wrapperStyle={{ maxHeight: 92, overflowY: 'auto', lineHeight: '18px', paddingTop: 4 }}
                                        formatter={(value: string) => (
                                            <span className="text-slate-700 text-[11px]" title={value}>{shortenDealer(value)}</span>
                                        )}
                                    />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No data for selected filters.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 3: Proposal Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Proposal Status</CardTitle>
                        <CardDescription>Approval pipeline overview.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px]">
                        {statusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={85}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CountTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        iconType="circle"
                                        formatter={(value) => <span className="text-slate-700 text-sm">{value}</span>}
                                    />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No proposals.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Budget Health by G/L Account</CardTitle>
                        <CardDescription>Top accounts by remaining budget capacity.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px] overflow-y-auto">
                        <div className="space-y-3">
                            {/* Copy first — sort() is in-place and would permanently reorder the
                                shared master list used by the submission form's G/L dropdown. */}
                            {[...MOCK_GL_ACCOUNTS]
                                .sort((a, b) => (a.budgetRemaining / a.totalBudget) - (b.budgetRemaining / b.totalBudget))
                                .slice(0, 10)
                                .map((account) => {
                                    const utilization = (account.budgetUsed / account.totalBudget) * 100;
                                    return (
                                        <div key={account.code} className="flex items-center gap-3">
                                            <div className="w-24 text-xs font-mono text-slate-500 shrink-0">{account.code}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs text-slate-700 font-medium truncate">{account.name}</span>
                                                    <span className="text-xs text-slate-500 ml-2 shrink-0">{utilization.toFixed(0)}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full ${utilization > 90 ? 'bg-red-500' : utilization > 75 ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(100, utilization)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
