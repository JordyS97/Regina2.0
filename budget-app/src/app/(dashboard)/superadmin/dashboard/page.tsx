'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import { MOCK_GL_ACCOUNTS, MOCK_PROPOSALS, MOCK_DEALERS } from '@/lib/mock-data';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell
} from 'recharts';
import {
    DownloadCloud, TrendingUp, Wallet, Activity, FilterX,
    Globe, Sprout, FileCheck, AlertTriangle, XCircle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { CHART_ACCENT, CHART_SERIES, STATUS_COLOR } from '@/lib/brand';
import { PageHeading, StatCard, UtilizationBar } from '@/components/ui/stat-card';

type TooltipProps = {
    active?: boolean;
    label?: string | number;
    payload?: { name?: string; value: number }[];
};

function CustomTooltip({ active, payload, label }: TooltipProps) {
    if (!active || !payload?.length) return null;
    const heading = label ?? payload[0].name;
    return (
        <div className="z-50 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg ring-1 ring-slate-900/5">
            {heading && <p className="mb-1 font-semibold text-slate-800">{heading}</p>}
            <p className="font-medium tabular-nums text-slate-700">{formatCurrency(payload[0].value)}</p>
        </div>
    );
}

function CountTooltip({ active, payload }: TooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="z-50 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg ring-1 ring-slate-900/5">
            <p className="mb-1 font-semibold text-slate-800">{payload[0].name}</p>
            <p className="text-slate-600">{payload[0].value} proposal</p>
        </div>
    );
}

export default function SuperAdminDashboardPage() {
    const { user } = useAuth();
    const [isDownloading, setIsDownloading] = useState(false);

    // Filters State
    const [selectedDealer, setSelectedDealer] = useState<string>('All');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    // Derived Data. Kept above the access guard because a hook skipped by an
    // early return changes the hook count between renders and crashes React.
    const filteredProposals = useMemo(() => {
        return MOCK_PROPOSALS.filter(p => {
            if (selectedDealer !== 'All' && p.dealer !== selectedDealer) return false;
            if (dateFrom && new Date(p.dateSubmitted) < new Date(dateFrom)) return false;
            if (dateTo && new Date(p.dateSubmitted) > new Date(`${dateTo}T23:59:59`)) return false;
            return true;
        });
    }, [selectedDealer, dateFrom, dateTo]);

    if (!user || user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Akses terbatas. Khusus Super Admin.</div>
            </div>
        );
    }

    const handleDownload = () => {
        setIsDownloading(true);
        alert("Downloading Enterprise Budget Summary...");
        setTimeout(() => setIsDownloading(false), 2000);
    };

    const clearFilters = () => {
        setSelectedDealer('All');
        setDateFrom('');
        setDateTo('');
    };

    // Enterprise KPI Calculations
    const enterpriseTotalBudget = MOCK_GL_ACCOUNTS.reduce((sum, acc) => sum + acc.totalBudget, 0);
    const totalBudget = selectedDealer === 'All' ? enterpriseTotalBudget : enterpriseTotalBudget / MOCK_DEALERS.length;
    const totalUsed = filteredProposals.reduce((sum, p) => sum + p.amount, 0);
    const totalRemaining = Math.max(0, totalBudget - totalUsed);
    const utilizedPercentage = totalBudget > 0 ? ((totalUsed / totalBudget) * 100).toFixed(1) : '0.0';

    const totalProposals = filteredProposals.length;
    const approvedCount = filteredProposals.filter(p => p.status === 'Approved').length;
    const pendingCount = filteredProposals.filter(p => p.status.startsWith('Pending')).length;
    const rejectedCount = filteredProposals.filter(p => p.status === 'Rejected').length;

    // 1. Monthly Trends (Line Chart)
    const monthlyDataMap = filteredProposals.reduce((acc, p) => {
        const date = new Date(p.dateSubmitted);
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
        const year = new Date(p.dateSubmitted).getFullYear().toString();
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
        { name: 'Disetujui', value: approvedCount, color: STATUS_COLOR.approved },
        { name: 'Menunggu', value: pendingCount, color: STATUS_COLOR.pending },
        { name: 'Ditolak', value: rejectedCount, color: STATUS_COLOR.rejected },
    ].filter(d => d.value > 0);



    const yAxisFormatter = (val: number) => {
        if (val >= 1000000000) return `Rp${(val / 1000000000).toFixed(1)}B`;
        if (val >= 1000000) return `Rp${(val / 1000000).toFixed(1)}M`;
        return `Rp${val}`;
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <PageHeading
                title={
                    <span className="flex items-center gap-2.5">
                        <Globe className="h-8 w-8 text-astra-600" />
                        Dashboard Enterprise
                    </span>
                }
                description="Pandangan menyeluruh atas seluruh aktivitas budget organisasi."
                action={
                    <Button onClick={handleDownload} disabled={isDownloading}>
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        {isDownloading ? 'Menyiapkan…' : 'Ekspor Laporan (PDF)'}
                    </Button>
                }
            />

            {/* Global Filters */}
            <Card className="border-slate-200 bg-slate-50/80">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Cabang Dealer</label>
                            <Select
                                value={selectedDealer}
                                onChange={(e) => setSelectedDealer(e.target.value)}
                                className="w-full bg-white"
                                options={[
                                    { label: "Semua Dealer (Enterprise)", value: "All" },
                                    ...MOCK_DEALERS.map(dealer => ({ label: dealer, value: dealer }))
                                ]}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Dari Tanggal</label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-white" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Sampai Tanggal</label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-white" />
                        </div>
                        <div className="flex-none">
                            <Button variant="outline" onClick={clearFilters} className="w-full md:w-auto h-[40px]">
                                <FilterX className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* KPI Cards Row 1: Financial */}
            <div className="padi-stagger grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Budget Enterprise"
                    value={formatCurrency(totalBudget)}
                    hint={`${MOCK_GL_ACCOUNTS.length} G/L account aktif`}
                    icon={Wallet}
                    accent="ink"
                />
                <StatCard
                    label="Budget Terpakai"
                    value={formatCurrency(totalUsed)}
                    hint={`${utilizedPercentage}% utilisasi`}
                    icon={TrendingUp}
                    accent="astra"
                />
                <StatCard
                    label="Sisa Budget"
                    value={formatCurrency(totalRemaining)}
                    hint="Kapasitas yang masih tersedia"
                    icon={Sprout}
                    accent="padi"
                />
                <StatCard
                    label="Utilisasi"
                    value={`${utilizedPercentage}%`}
                    icon={Activity}
                    accent={Number(utilizedPercentage) > 90 ? 'honda' : 'bulir'}
                >
                    <UtilizationBar percent={Number(utilizedPercentage)} />
                </StatCard>
            </div>

            {/* KPI Cards Row 2: Operational */}
            <div className="padi-stagger grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Proposal"
                    value={totalProposals}
                    hint="Dalam cakupan filter saat ini"
                    icon={FileCheck}
                    accent="astra"
                />
                <StatCard
                    label="Disetujui"
                    value={approvedCount}
                    hint={`${totalProposals > 0 ? ((approvedCount / totalProposals) * 100).toFixed(0) : 0}% tingkat persetujuan`}
                    icon={Sprout}
                    accent="padi"
                />
                <StatCard
                    label="Menunggu Review"
                    value={pendingCount}
                    hint="Masih dalam rantai persetujuan"
                    icon={AlertTriangle}
                    accent="bulir"
                />
                <StatCard
                    label="Ditolak"
                    value={rejectedCount}
                    hint={`${totalProposals > 0 ? ((rejectedCount / totalProposals) * 100).toFixed(0) : 0}% tingkat penolakan`}
                    icon={XCircle}
                    accent="honda"
                />
            </div>

            {/* Charts Row 1: Monthly Trends & Yearly */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Tren Pengajuan Bulanan</CardTitle>
                        <CardDescription>Linimasa proposal budget seluruh organisasi.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_ACCENT.grid} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                    <Line type="monotone" dataKey="Amount" stroke={CHART_ACCENT.astra} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">Belum ada data untuk filter ini.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Perbandingan Tahunan</CardTitle>
                        <CardDescription>Perbandingan belanja antar tahun.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {yearlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_ACCENT.grid} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="Amount" fill={CHART_ACCENT.padi} radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">Belum ada data untuk filter ini.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2: Spending Categories & Dealer Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Kategori Belanja Tertinggi</CardTitle>
                        <CardDescription>Belanja per G/L account, terbesar ke terkecil.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {spendingData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={spendingData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_ACCENT.grid} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 11, width: 140 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="Amount" fill={CHART_ACCENT.astra} radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">Belum ada data untuk filter ini.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Distribusi Dealer</CardTitle>
                        <CardDescription>Penggunaan budget per cabang dealer.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {dealerData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={dealerData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {dealerData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={CHART_SERIES[index % CHART_SERIES.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        formatter={(value) => <span className="text-slate-700 text-xs">{value}</span>}
                                    />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">Belum ada data untuk filter ini.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 3: Proposal Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Status Proposal</CardTitle>
                        <CardDescription>Ringkasan alur persetujuan.</CardDescription>
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
                            <div className="h-full flex items-center justify-center text-slate-400">Belum ada proposal.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Kesehatan Budget per G/L Account</CardTitle>
                        <CardDescription>Akun dengan sisa kapasitas budget paling menipis.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[280px] overflow-y-auto">
                        <div className="space-y-3">
                            {MOCK_GL_ACCOUNTS
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
                                                        className={`h-1.5 rounded-full ${utilization > 90 ? 'bg-honda-600' : utilization > 75 ? 'bg-bulir-400' : 'bg-padi-500'}`}
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
