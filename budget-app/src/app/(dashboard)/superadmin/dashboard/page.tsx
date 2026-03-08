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
    DownloadCloud, TrendingUp, DollarSign, Activity, FilterX,
    Globe, Users, FileCheck, AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function SuperAdminDashboardPage() {
    const { user } = useAuth();
    const [isDownloading, setIsDownloading] = useState(false);

    // Filters State
    const [selectedDealer, setSelectedDealer] = useState<string>('All');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    if (!user || user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Access Restricted. Super Admins only.</div>
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

    // Derived Data
    const filteredProposals = useMemo(() => {
        return MOCK_PROPOSALS.filter(p => {
            if (selectedDealer !== 'All' && p.dealer !== selectedDealer) return false;
            if (dateFrom && new Date(p.dateSubmitted) < new Date(dateFrom)) return false;
            if (dateTo && new Date(p.dateSubmitted) > new Date(`${dateTo}T23:59:59`)) return false;
            return true;
        });
    }, [selectedDealer, dateFrom, dateTo]);

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
        { name: 'Approved', value: approvedCount, color: '#10b981' },
        { name: 'Pending', value: pendingCount, color: '#f59e0b' },
        { name: 'Rejected', value: rejectedCount, color: '#ef4444' },
    ].filter(d => d.value > 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white border border-slate-200 p-3 shadow-md rounded-lg text-sm z-50">
                    {label && <p className="font-semibold text-slate-800 mb-1">{label}</p>}
                    {!label && payload[0].name && <p className="font-semibold text-slate-800 mb-1">{payload[0].name}</p>}
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
                    <p className="text-slate-500 mt-1">Bird's-eye view of all budget activity across the organization.</p>
                </div>
                <Button onClick={handleDownload} disabled={isDownloading} className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800">
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    {isDownloading ? 'Downloading...' : 'Export Report (PDF)'}
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
                        <p className="text-xs text-blue-200 mt-1">{utilizedPercentage}% utilization</p>
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
                        <CardDescription>G/L account expenditure ranked highest to lowest.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {spendingData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={spendingData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, width: 140 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="Amount" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={20} />
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
                                        cy="45%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {dealerData.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
