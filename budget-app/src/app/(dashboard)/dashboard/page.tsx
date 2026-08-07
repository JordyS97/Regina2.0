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
import { DownloadCloud, Sprout, Wallet, PieChart, Activity, FilterX } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { CHART_ACCENT, CHART_SERIES } from '@/lib/brand';
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

    // Every hook has to run on every render, so the filtering memo lives above
    // the access guards below. Returning early before a hook makes React render
    // fewer hooks than the previous pass and throw.
    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            if (selectedDealer !== 'All' && p.dealer !== selectedDealer) return false;
            if (dateFrom && new Date(p.dateSubmitted) < new Date(dateFrom)) return false;
            if (dateTo && new Date(p.dateSubmitted) > new Date(`${dateTo}T23:59:59`)) return false;
            return true;
        });
    }, [proposals, selectedDealer, dateFrom, dateTo]);

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


    const yAxisFormatter = (val: number) => {
        if (val >= 1000000000) return `Rp${(val / 1000000000).toFixed(1)}B`;
        if (val >= 1000000) return `Rp${(val / 1000000).toFixed(1)}M`;
        return `Rp${val}`;
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <PageHeading
                title="Dashboard"
                description={`Selamat datang kembali, ${user.name}. Berikut ringkasan budget Anda.`}
                action={
                    <Button onClick={handleDownload} disabled={isDownloading}>
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        {isDownloading ? 'Menyiapkan…' : 'Unduh Ringkasan (PDF)'}
                    </Button>
                }
            />

            {/* Global Filters */}
            <Card className="border-slate-200 bg-slate-50/80">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="text-sm font-medium text-slate-700">Dealer</label>
                            <Select
                                value={selectedDealer}
                                onChange={(e) => setSelectedDealer(e.target.value)}
                                className="w-full bg-white"
                                options={[
                                    { label: "Semua Dealer", value: "All" },
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

            {/* KPI Cards — the crop cycle, left to right: what was sown, what
                has been spent, what is still growing, how full the field is. */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Kapasitas Budget"
                    value={formatCurrency(totalBudget)}
                    hint="Sesuai cakupan filter saat ini"
                    icon={Wallet}
                    accent="astra"
                />
                <StatCard
                    label="Terpakai (Terfilter)"
                    value={formatCurrency(totalUsed)}
                    hint="Seluruh proposal pada tampilan ini"
                    icon={PieChart}
                    accent="bulir"
                />
                <StatCard
                    label="Estimasi Sisa"
                    value={formatCurrency(totalRemaining)}
                    hint="Perkiraan ketersediaan dana"
                    icon={Sprout}
                    accent="padi"
                />
                <StatCard
                    label="Utilisasi"
                    value={`${utilizedPercentage}%`}
                    icon={Activity}
                    accent={Number(utilizedPercentage) > 90 ? 'honda' : 'ink'}
                >
                    <UtilizationBar percent={Number(utilizedPercentage)} />
                </StatCard>
            </div>

            {/* Charts Section 1: Monthly Trends & Yearly */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Line Chart (Monthly Trends) */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Tren Pengajuan Bulanan</CardTitle>
                        <CardDescription>
                            Perjalanan proposal budget dari bulan ke bulan.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_ACCENT.grid} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 12 }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }} />
                                    <Line type="monotone" dataKey="Amount" stroke={CHART_ACCENT.astra} strokeWidth={3} dot={{ r: 3.5, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">Belum ada data untuk filter ini.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Column Chart (Yearly) */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Ringkasan Tahunan</CardTitle>
                        <CardDescription>
                            Perbandingan belanja antar tahun.
                        </CardDescription>
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

            {/* Charts Section 2: Spending Categories & Volumes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sorted Bar Chart (Categories) */}
                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Kategori Belanja Tertinggi</CardTitle>
                        <CardDescription>
                            Pengeluaran diurutkan dari terbesar ke terkecil.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {spendingData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={spendingData} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_ACCENT.grid} />
                                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 12 }} tickFormatter={yAxisFormatter} />
                                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: CHART_ACCENT.axis, fontSize: 12, width: 90 }} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                                    <Bar dataKey="Amount" fill={CHART_ACCENT.astra} radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400">Belum ada data untuk filter ini.</div>
                        )}
                    </CardContent>
                </Card>

                {/* Donut Chart (Submission Categories) */}
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Distribusi Proposal</CardTitle>
                        <CardDescription>
                            Sebaran nilai berdasarkan tipe pengajuan.
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
                                            <Cell key={`cell-${index}`} fill={CHART_SERIES[index % CHART_SERIES.length]} />
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
                            <div className="h-full flex items-center justify-center text-slate-400">Belum ada data untuk filter ini.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
