'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/context/auth-context';
import { MOCK_GL_ACCOUNTS, MOCK_DEALERS } from '@/lib/mock-data';
import { Proposal } from '@/lib/types';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { DownloadCloud, TrendingUp, DollarSign, PieChart, Activity, FilterX } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function DashboardPage() {
    const { user } = useAuth();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters State
    const [selectedDealer, setSelectedDealer] = useState<string>('All');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (!db) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(collection(db, 'proposals'), (snapshot) => {
            const fetchedProposals: Proposal[] = [];
            snapshot.forEach((doc) => {
                fetchedProposals.push({ id: doc.id, ...doc.data() } as Proposal);
            });
            setProposals(fetchedProposals);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching proposals:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (!user) return null;

    // Restrict access
    if (user.role === 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Super Admins should use the System Overview.</div>
            </div>
        );
    }

    const handleDownload = () => {
        setIsDownloading(true);
        alert("Downloading Budget Summary...");
        setTimeout(() => setIsDownloading(false), 2000);
    };

    const clearFilters = () => {
        setSelectedDealer('All');
        setDateFrom('');
        setDateTo('');
    };

    // Derived Data
    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            if (selectedDealer !== 'All' && p.dealer !== selectedDealer) return false;
            if (dateFrom && new Date(p.dateSubmitted) < new Date(dateFrom)) return false;
            if (dateTo && new Date(p.dateSubmitted) > new Date(`${dateTo}T23:59:59`)) return false;
            return true;
        });
    }, [proposals, selectedDealer, dateFrom, dateTo]);

    // KPI Calculations
    const enterpriseTotalBudget = MOCK_GL_ACCOUNTS.reduce((sum, acc) => sum + acc.totalBudget, 0);
    const totalBudget = selectedDealer === 'All' ? enterpriseTotalBudget : enterpriseTotalBudget / MOCK_DEALERS.length;

    const totalUsed = filteredProposals.reduce((sum, p) => sum + p.amount, 0);
    const totalRemaining = Math.max(0, totalBudget - totalUsed);
    const utilizedPercentage = totalBudget > 0 ? ((totalUsed / totalBudget) * 100).toFixed(1) : '0.0';

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

    // 4. Submission Volumes (Donut Chart)
    const categoryDataMap = filteredProposals.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + p.amount;
        return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.keys(categoryDataMap).map(key => ({
        name: key,
        value: categoryDataMap[key]
    })).sort((a, b) => b.value - a.value);

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

    const yAxisFormatter = (val: number) => {
        if (val >= 1000000000) return `Rp${(val / 1000000000).toFixed(1)}B`;
        if (val >= 1000000) return `Rp${(val / 1000000).toFixed(1)}M`;
        return `Rp${val}`;
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
                    <p className="text-slate-500 mt-1">Welcome back, {user.name}. Here is your budget overview.</p>
                </div>
                <Button onClick={handleDownload} disabled={isDownloading} className="self-start sm:self-auto">
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    {isDownloading ? 'Downloading...' : 'Download Summary (PDF)'}
                </Button>
            </div>

            {/* Global Filters */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Dealer</label>
                            <Select
                                value={selectedDealer}
                                onChange={(e) => setSelectedDealer(e.target.value)}
                                className="w-full bg-white"
                                options={[
                                    { label: "All Dealers", value: "All" },
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Budget Capacity</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalBudget)}</div>
                        <p className="text-xs text-slate-500 mt-1">Based on current filter scoped capacity</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Filtered Spend (Used)</CardTitle>
                        <PieChart className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalUsed)}</div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center">
                            All proposals in current view
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Est. Remaining</CardTitle>
                        <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalRemaining)}</div>
                        <p className="text-xs text-slate-500 mt-1">Estimated availability</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Utilization %</CardTitle>
                        <BarChart3Icon className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{utilizedPercentage}%</div>
                        <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                            <div
                                className={`h-2 rounded-full ${Number(utilizedPercentage) > 80 ? 'bg-red-500' : 'bg-blue-600'}`}
                                style={{ width: `${Math.min(100, Number(utilizedPercentage))}%` }}
                            ></div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section 1: Monthly Trends & Yearly */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Line Chart (Monthly Trends) */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Monthly Submission Trends</CardTitle>
                        <CardDescription>
                            Timeline of budget proposals over the months.
                        </CardDescription>
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

                {/* Column Chart (Yearly) */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Yearly Snapshot</CardTitle>
                        <CardDescription>
                            Macro comparison of spending year-over-year.
                        </CardDescription>
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

            {/* Charts Section 2: Spending Categories & Volumes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sorted Bar Chart (Categories) */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Top Spending Categories</CardTitle>
                        <CardDescription>
                            Expenditure ranked from highest to lowest.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {spendingData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={spendingData} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, width: 90 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="Amount" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No data for selected filters.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Donut Chart (Submission Categories) */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Proposal Distribution</CardTitle>
                        <CardDescription>
                            Volume breakdown by proposal type.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {categoryData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={70}
                                        outerRadius={110}
                                        paddingAngle={3}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        iconType="circle"
                                        formatter={(value) => <span className="text-slate-700 text-sm">{value}</span>}
                                    />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">No data for selected filters.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}

function BarChart3Icon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
        </svg>
    );
}
