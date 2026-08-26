'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { MOCK_DEALERS, MOCK_GL_ACCOUNTS } from '@/lib/mock-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Activity, Eye, FilterX, Search, Sprout, TrendingUp, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PageHeading, StatCard, UtilizationBar } from '@/components/ui/stat-card';
import { ProposalDetailModal } from '@/components/proposal/proposal-detail-modal';
import { useProposals } from '@/hooks/use-proposals';
import { useBudgetAllocations } from '@/hooks/use-budget-allocations';
import {
    budgetDocId,
    currentBudgetPeriod,
    healthOf,
    usageFor,
    utilization,
} from '@/lib/budget';
import {
    formatDate,
    formatProposalNumber,
    getBottleneck,
    STATUS_LABEL,
    statusBadgeVariant,
} from '@/lib/proposal';
import type { Proposal, ProposalStatus } from '@/lib/types';

const STATUS_FILTERS: { label: string; value: string }[] = [
    { label: 'Semua Status', value: 'All' },
    { label: 'Menunggu Supervisor', value: 'Pending Supervisor' },
    { label: 'Menunggu Sub Dept', value: 'Pending Sub Dept' },
    { label: 'Menunggu Finance', value: 'Pending Finance' },
    { label: 'Menunggu Region', value: 'Pending Region' },
    { label: 'Disetujui', value: 'Approved' },
    { label: 'Ditolak', value: 'Rejected' },
];

export default function OverviewPage() {
    const { user } = useAuth();
    const period = currentBudgetPeriod();

    const { proposals, loading, isSample, error } = useProposals();
    const { allocations } = useBudgetAllocations(period);

    // Proposal inspector filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [dealerFilter, setDealerFilter] = useState('All');
    const [glFilter, setGlFilter] = useState('All');
    const [detailProposal, setDetailProposal] = useState<Proposal | null>(null);

    /**
     * A G/L account's ceiling comes from Pengaturan Budget once it is set; the
     * seeded figure stands in until then, so the page is never blank on a fresh
     * install and the two screens never disagree about a configured account.
     */
    const glRows = useMemo(() => {
        return MOCK_GL_ACCOUNTS.map((account) => {
            const allocation = allocations[budgetDocId('GLAccount', account.code, period)];
            const configured = !!allocation?.totalBudget;
            const totalBudget = configured ? allocation!.totalBudget : account.totalBudget;
            const usage = usageFor(proposals, (p) => p.glAccountCode === account.code);
            const percent = utilization(usage.committed, totalBudget);
            return {
                account,
                configured,
                totalBudget,
                usage,
                percent,
                remaining: totalBudget - usage.committed,
            };
        });
    }, [allocations, proposals, period]);

    const totals = useMemo(() => {
        const totalBudget = glRows.reduce((sum, row) => sum + row.totalBudget, 0);
        const committed = glRows.reduce((sum, row) => sum + row.usage.committed, 0);
        const approved = glRows.reduce((sum, row) => sum + row.usage.approved, 0);
        const configured = glRows.filter((row) => row.configured).length;
        return { totalBudget, committed, approved, configured };
    }, [glRows]);

    const filteredProposals = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return proposals.filter((p) => {
            if (statusFilter !== 'All' && p.status !== statusFilter) return false;
            if (dealerFilter !== 'All' && p.dealer !== dealerFilter) return false;
            if (glFilter !== 'All' && p.glAccountCode !== glFilter) return false;
            if (!needle) return true;
            return (
                p.title?.toLowerCase().includes(needle) ||
                p.dealer?.toLowerCase().includes(needle) ||
                p.glAccountCode?.toLowerCase().includes(needle) ||
                p.submitterName?.toLowerCase().includes(needle) ||
                p.trackingId?.toLowerCase().includes(needle) ||
                formatProposalNumber(p).toLowerCase().includes(needle)
            );
        });
    }, [proposals, search, statusFilter, dealerFilter, glFilter]);

    if (!user) return null;

    if (user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Akses terbatas. Khusus Super Admin.</div>
            </div>
        );
    }

    const utilizedPercentage = utilization(totals.committed, totals.totalBudget);
    const hasFilters = search !== '' || statusFilter !== 'All' || dealerFilter !== 'All' || glFilter !== 'All';

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('All');
        setDealerFilter('All');
        setGlFilter('All');
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <PageHeading
                title="Ikhtisar Sistem"
                description="Konsumsi budget, kesehatan pagu, dan pemeriksaan proposal satu per satu."
                action={
                    <Link href="/superadmin/budget">
                        <Button variant="outline" className="bg-white">
                            <Wallet className="mr-2 h-4 w-4" />
                            Atur Pagu Budget
                        </Button>
                    </Link>
                }
            />

            {(isSample || error) && (
                <div className="rounded-xl border border-bulir-200 bg-bulir-50 px-4 py-3 text-sm text-bulir-800">
                    {error
                        ? `Firestore menolak permintaan: ${error}`
                        : 'Firebase belum dikonfigurasi — menampilkan data proposal contoh.'}
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Pagu Enterprise"
                    value={formatCurrency(totals.totalBudget)}
                    hint={`${totals.configured} dari ${MOCK_GL_ACCOUNTS.length} G/L account sudah diatur manual`}
                    icon={Wallet}
                    accent="ink"
                />
                <StatCard
                    label="Budget Terpakai"
                    value={formatCurrency(totals.committed)}
                    hint={`${formatCurrency(totals.approved)} sudah disetujui penuh`}
                    icon={TrendingUp}
                    accent="astra"
                />
                <StatCard
                    label="Sisa Budget"
                    value={formatCurrency(Math.max(0, totals.totalBudget - totals.committed))}
                    hint="Kapasitas yang masih tersedia"
                    icon={Sprout}
                    accent="padi"
                />
                <StatCard
                    label="Utilisasi Global"
                    value={`${utilizedPercentage.toFixed(1)}%`}
                    icon={Activity}
                    accent={utilizedPercentage > 90 ? 'honda' : 'bulir'}
                >
                    <UtilizationBar percent={utilizedPercentage} />
                </StatCard>
            </div>

            {/* Proposal inspector ------------------------------------------------
                The Super Admin's entry point for reading a single proposal end to
                end: the same detail view the approvers see, over every record in
                the system. */}
            <Card>
                <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <CardTitle>Pemeriksaan Proposal</CardTitle>
                            <CardDescription>
                                Telusuri dan buka setiap proposal secara detail — termasuk rincian biaya,
                                lampiran, dan riwayat persetujuannya.
                            </CardDescription>
                        </div>
                        <div className="relative w-full lg:w-80">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Cari nomor, judul, dealer, pengaju…"
                                className="bg-white pl-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Status</label>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-white"
                                options={STATUS_FILTERS}
                            />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Sales Office</label>
                            <Select
                                value={dealerFilter}
                                onChange={(e) => setDealerFilter(e.target.value)}
                                className="bg-white"
                                options={[
                                    { label: 'Semua SO', value: 'All' },
                                    ...MOCK_DEALERS.map((dealer) => ({ label: dealer, value: dealer })),
                                ]}
                            />
                        </div>
                        <div className="flex-1 space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">G/L Account</label>
                            <Select
                                value={glFilter}
                                onChange={(e) => setGlFilter(e.target.value)}
                                className="bg-white"
                                options={[
                                    { label: 'Semua G/L', value: 'All' },
                                    ...MOCK_GL_ACCOUNTS.map((account) => ({
                                        label: `${account.code} — ${account.name}`,
                                        value: account.code,
                                    })),
                                ]}
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={clearFilters}
                            disabled={!hasFilters}
                            className="h-9 shrink-0"
                        >
                            <FilterX className="mr-2 h-4 w-4" />
                            Reset
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">Nomor Proposal</TableHead>
                                <TableHead>Judul & Pengaju</TableHead>
                                <TableHead>Sales Office</TableHead>
                                <TableHead className="text-right">Nilai</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="pr-6 text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-28 text-center text-slate-500">
                                        <div className="flex items-center justify-center">
                                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-astra-600" />
                                            <span className="ml-3">Memuat proposal…</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredProposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                        Tidak ada proposal yang cocok dengan filter ini.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProposals.map((proposal) => (
                                    <TableRow key={proposal.id} className="hover:bg-slate-50">
                                        <TableCell className="pl-6 whitespace-nowrap font-mono text-xs font-semibold text-slate-700">
                                            {formatProposalNumber(proposal)}
                                            <div className="mt-1 font-sans text-[11px] font-normal text-slate-400">
                                                {formatDate(proposal.dateSubmitted)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-slate-900">{proposal.title}</div>
                                            <div className="text-xs text-slate-500">
                                                {proposal.submitterName || proposal.submitterId}
                                                {proposal.glAccountCode && (
                                                    <span className="ml-2 font-mono text-slate-400">
                                                        {proposal.glAccountCode}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-nowrap text-sm text-slate-600">
                                            {proposal.dealer}
                                        </TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums text-slate-900">
                                            {formatCurrency(proposal.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={statusBadgeVariant(proposal.status)}>
                                                {STATUS_LABEL[proposal.status] ?? proposal.status}
                                            </Badge>
                                            {proposal.status.startsWith('Pending') && (
                                                <div className="mt-1 text-[11px] text-slate-500">
                                                    di {getBottleneck(proposal.status as ProposalStatus)}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="pr-6 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDetailProposal(proposal)}
                                            >
                                                <Eye className="mr-1 h-4 w-4" /> Detail
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* G/L breakdown -------------------------------------------------- */}
            <Card>
                <CardHeader>
                    <CardTitle>Rincian G/L Account</CardTitle>
                    <CardDescription>
                        Pagu diambil dari Pengaturan Budget; akun yang belum diatur memakai nilai bawaan.
                        Klik &ldquo;Lihat proposal&rdquo; untuk menyaring daftar di atas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kode Akun</TableHead>
                                    <TableHead>Departemen / Nama</TableHead>
                                    <TableHead className="text-right">Pagu</TableHead>
                                    <TableHead className="text-right">Terpakai</TableHead>
                                    <TableHead className="text-right">Sisa</TableHead>
                                    <TableHead className="text-right">Kesehatan</TableHead>
                                    <TableHead className="text-right">Proposal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {glRows.map(({ account, configured, totalBudget, usage, percent, remaining }) => {
                                    const health = healthOf(percent);
                                    return (
                                        <TableRow key={account.code} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">{account.code}</TableCell>
                                            <TableCell className="font-medium text-slate-900">
                                                {account.name}
                                                {!configured && (
                                                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                                        pagu bawaan
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">
                                                {formatCurrency(totalBudget)}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {formatCurrency(usage.committed)}
                                            </TableCell>
                                            <TableCell
                                                className={`text-right tabular-nums ${remaining < 0 ? 'text-honda-600 font-medium' : ''}`}
                                            >
                                                {formatCurrency(remaining)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    variant={
                                                        health === 'Sehat'
                                                            ? 'success'
                                                            : health === 'Waspada'
                                                                ? 'warning'
                                                                : 'destructive'
                                                    }
                                                >
                                                    {health}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={usage.count === 0}
                                                    onClick={() => {
                                                        setGlFilter(account.code);
                                                        setStatusFilter('All');
                                                        setDealerFilter('All');
                                                        setSearch('');
                                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                                    }}
                                                >
                                                    Lihat proposal ({usage.count})
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <ProposalDetailModal
                proposal={detailProposal}
                isOpen={!!detailProposal}
                onClose={() => setDetailProposal(null)}
            />
        </div>
    );
}
