'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { PageHeading, StatCard, UtilizationBar } from '@/components/ui/stat-card';
import { useAuth } from '@/context/auth-context';
import { useProposals } from '@/hooks/use-proposals';
import { useBudgetAllocations } from '@/hooks/use-budget-allocations';
import { useToast } from '@/components/ui/toast';
import { MOCK_DEALERS, MOCK_GL_ACCOUNTS } from '@/lib/mock-data';
import {
    budgetDocId,
    budgetPeriodOptions,
    currentBudgetPeriod,
    healthOf,
    usageFor,
    utilization,
} from '@/lib/budget';
import type { BudgetScope } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';
import { Activity, Landmark, Save, Search, Sprout, TrendingUp, Wallet } from 'lucide-react';

type TabKey = 'dealer' | 'gl';

interface BudgetRow {
    scope: BudgetScope;
    key: string;
    label: string;
    /** Short code shown in the leading column: dealer code or G/L code. */
    code: string;
}

/** Digits only, so a pasted "Rp 15.000.000" still lands as 15000000. */
function digitsOnly(value: string): string {
    return value.replace(/\D/g, '');
}

function groupDigits(value: string): string {
    if (!value) return '';
    return Number(value).toLocaleString('id-ID');
}

export default function BudgetManagementPage() {
    const { user } = useAuth();
    const { notify } = useToast();

    const [period, setPeriod] = useState<string>(currentBudgetPeriod());
    const [tab, setTab] = useState<TabKey>('dealer');
    const [search, setSearch] = useState('');
    /** Unsaved edits, keyed by allocation document id. */
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    const { proposals, isSample } = useProposals();
    const { allocations, isLocalOnly, error, saveAllocation } = useBudgetAllocations(period);

    // Only proposals raised in the selected year count against that year's pagu.
    const periodProposals = useMemo(
        () => proposals.filter((p) => new Date(p.dateSubmitted).getFullYear() === Number(period)),
        [proposals, period]
    );

    const rows = useMemo<BudgetRow[]>(() => {
        if (tab === 'dealer') {
            return MOCK_DEALERS.map((dealer) => ({
                scope: 'Dealer' as const,
                key: dealer,
                label: dealer.split('-').slice(1).join('-').trim() || dealer,
                code: dealer.split('-')[0],
            }));
        }
        return MOCK_GL_ACCOUNTS.map((account) => ({
            scope: 'GLAccount' as const,
            key: account.code,
            label: account.name,
            code: account.code,
        }));
    }, [tab]);

    const visibleRows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return rows;
        return rows.filter(
            (row) =>
                row.label.toLowerCase().includes(needle) ||
                row.code.toLowerCase().includes(needle) ||
                row.key.toLowerCase().includes(needle)
        );
    }, [rows, search]);

    /** Everything one row needs to render, derived from proposals + ceiling. */
    const rowData = useMemo(() => {
        return visibleRows.map((row) => {
            const id = budgetDocId(row.scope, row.key, period);
            const allocation = allocations[id];
            const usage = usageFor(periodProposals, (p) =>
                row.scope === 'Dealer' ? p.dealer === row.key : p.glAccountCode === row.key
            );
            const total = allocation?.totalBudget ?? 0;
            const percent = utilization(usage.committed, total);
            return { row, id, allocation, usage, total, percent, remaining: total - usage.committed };
        });
    }, [visibleRows, allocations, periodProposals, period]);

    // Totals cover the whole tab, not just what the search happens to show.
    const totals = useMemo(() => {
        const allIds = rows.map((row) => budgetDocId(row.scope, row.key, period));
        const totalBudget = allIds.reduce((sum, id) => sum + (allocations[id]?.totalBudget ?? 0), 0);
        const usage = usageFor(periodProposals, (p) =>
            tab === 'dealer'
                ? MOCK_DEALERS.includes(p.dealer)
                : MOCK_GL_ACCOUNTS.some((account) => account.code === p.glAccountCode)
        );
        const configured = allIds.filter((id) => allocations[id]?.totalBudget).length;
        return { totalBudget, usage, configured, count: rows.length };
    }, [rows, allocations, periodProposals, period, tab]);

    if (!user || user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Akses terbatas. Khusus Super Admin.</div>
            </div>
        );
    }

    const draftFor = (id: string, allocationTotal?: number) =>
        drafts[id] ?? (allocationTotal ? String(allocationTotal) : '');

    const isDirty = (id: string, allocationTotal?: number) =>
        drafts[id] !== undefined && drafts[id] !== (allocationTotal ? String(allocationTotal) : '');

    const handleSave = async (
        id: string,
        row: BudgetRow,
        allocationTotal: number | undefined
    ) => {
        const raw = draftFor(id, allocationTotal);
        const value = Number(raw || 0);

        if (Number.isNaN(value) || value < 0) {
            notify({
                title: 'Nilai tidak valid',
                description: 'Pagu budget harus berupa angka yang tidak negatif.',
                variant: 'error',
            });
            return;
        }

        setSavingId(id);
        try {
            await saveAllocation({
                scope: row.scope,
                key: row.key,
                label: row.label,
                totalBudget: value,
                updatedBy: user.name,
            });

            setDrafts((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });

            notify({
                title: 'Pagu budget tersimpan',
                description: isLocalOnly
                    ? `${row.label}: ${formatCurrency(value)} (belum tersimpan ke server — Firebase belum dikonfigurasi).`
                    : `${row.label} untuk periode ${period} kini dibatasi ${formatCurrency(value)}.`,
                variant: isLocalOnly ? 'warning' : 'success',
            });
        } catch (err) {
            console.error('Error saving budget allocation:', err);
            notify({
                title: 'Gagal menyimpan pagu',
                description: err instanceof Error ? err.message : 'Periksa koneksi lalu coba lagi.',
                variant: 'error',
            });
        } finally {
            setSavingId(null);
        }
    };

    const scopeLabel = tab === 'dealer' ? 'Sales Office' : 'G/L Account';
    const globalPercent = utilization(totals.usage.committed, totals.totalBudget);

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-10">
            <PageHeading
                title={
                    <span className="flex items-center gap-2.5">
                        <Wallet className="h-8 w-8 text-astra-600" />
                        Pengaturan Budget
                    </span>
                }
                description="Tetapkan total budget yang boleh diajukan per Sales Office dan per G/L account."
                action={
                    <div className="flex items-end gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Periode</label>
                            <Select
                                value={period}
                                onChange={(e) => {
                                    setPeriod(e.target.value);
                                    setDrafts({});
                                }}
                                className="w-32 bg-white"
                                options={budgetPeriodOptions().map((year) => ({ label: year, value: year }))}
                            />
                        </div>
                    </div>
                }
            />

            {(isLocalOnly || isSample || error) && (
                <div className="rounded-xl border border-bulir-200 bg-bulir-50 px-4 py-3 text-sm text-bulir-800">
                    {error
                        ? `Firestore menolak permintaan: ${error}`
                        : isLocalOnly
                            ? 'Firebase belum dikonfigurasi. Perubahan pagu hanya tersimpan sementara di browser ini.'
                            : 'Menampilkan data proposal contoh karena koneksi Firestore belum tersedia.'}
                </div>
            )}

            {/* Totals for the active scope ------------------------------------ */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label={`Total Pagu ${scopeLabel}`}
                    value={formatCurrency(totals.totalBudget)}
                    hint={`${totals.configured} dari ${totals.count} ${scopeLabel} sudah diatur`}
                    icon={Wallet}
                    accent="ink"
                />
                <StatCard
                    label="Terpakai (Disetujui)"
                    value={formatCurrency(totals.usage.approved)}
                    hint={`${totals.usage.count} proposal pada periode ${period}`}
                    icon={TrendingUp}
                    accent="astra"
                />
                <StatCard
                    label="Dalam Proses"
                    value={formatCurrency(totals.usage.pending)}
                    hint="Masih berjalan di rantai persetujuan"
                    icon={Activity}
                    accent="bulir"
                />
                <StatCard
                    label="Sisa Pagu"
                    value={formatCurrency(Math.max(0, totals.totalBudget - totals.usage.committed))}
                    hint={`${globalPercent.toFixed(1)}% pagu terpakai`}
                    icon={Sprout}
                    accent={globalPercent > 90 ? 'honda' : 'padi'}
                >
                    <UtilizationBar percent={globalPercent} />
                </StatCard>
            </div>

            {/* Scope switch --------------------------------------------------- */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex w-fit space-x-1 rounded-lg bg-slate-100 p-1">
                    {([
                        { key: 'dealer' as const, label: 'Per Sales Office', icon: Landmark },
                        { key: 'gl' as const, label: 'Per G/L Account', icon: Wallet },
                    ]).map((option) => (
                        <button
                            key={option.key}
                            onClick={() => {
                                setTab(option.key);
                                setSearch('');
                            }}
                            className={cn(
                                'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150',
                                tab === option.key
                                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                                    : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                            )}
                        >
                            <option.icon className="h-4 w-4" />
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder={tab === 'dealer' ? 'Cari sales office…' : 'Cari kode atau nama G/L…'}
                        className="bg-white pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Allocation table ----------------------------------------------- */}
            <Card>
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle>Pagu Pengajuan per {scopeLabel}</CardTitle>
                    <CardDescription>
                        Nilai ini menjadi batas total pengajuan pada periode {period}. Proposal yang
                        masih berjalan ikut dihitung, agar pagu tidak terlanjur habis di akhir alur.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-6">{tab === 'dealer' ? 'Kode' : 'Kode Akun'}</TableHead>
                                <TableHead>{tab === 'dealer' ? 'Sales Office' : 'Nama Akun'}</TableHead>
                                <TableHead className="w-56">Total Budget (Pagu)</TableHead>
                                <TableHead className="text-right">Terpakai</TableHead>
                                <TableHead className="text-right">Sisa</TableHead>
                                <TableHead className="w-40">Kesehatan</TableHead>
                                <TableHead className="pr-6 text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rowData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                        Tidak ada {scopeLabel} yang cocok dengan pencarian.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rowData.map(({ row, id, allocation, usage, total, percent, remaining }) => {
                                    const dirty = isDirty(id, allocation?.totalBudget);
                                    const health = healthOf(percent);

                                    return (
                                        <TableRow key={id}>
                                            <TableCell className="pl-6 font-mono text-xs font-semibold text-slate-700">
                                                {row.code}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-slate-900">{row.label}</div>
                                                <div className="text-xs text-slate-400">
                                                    {usage.count} proposal · diperbarui{' '}
                                                    {allocation?.updatedAt
                                                        ? new Date(allocation.updatedAt).toLocaleDateString('id-ID')
                                                        : 'belum pernah'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="relative">
                                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                                                        Rp
                                                    </span>
                                                    <Input
                                                        inputMode="numeric"
                                                        value={groupDigits(draftFor(id, allocation?.totalBudget))}
                                                        onChange={(e) =>
                                                            setDrafts((prev) => ({
                                                                ...prev,
                                                                [id]: digitsOnly(e.target.value),
                                                            }))
                                                        }
                                                        placeholder="0"
                                                        className={cn(
                                                            'pl-9 text-right tabular-nums',
                                                            dirty && 'border-astra-400 ring-2 ring-astra-500/20'
                                                        )}
                                                    />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                <div className="font-medium text-slate-800">{formatCurrency(usage.committed)}</div>
                                                {usage.pending > 0 && (
                                                    <div className="text-[11px] text-bulir-700">
                                                        {formatCurrency(usage.pending)} dalam proses
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell
                                                className={cn(
                                                    'text-right font-medium tabular-nums',
                                                    total > 0 && remaining < 0 ? 'text-honda-600' : 'text-slate-800'
                                                )}
                                            >
                                                {/* A remaining balance against a ceiling nobody has set
                                                    is not "minus 250 juta" — it is simply not known yet. */}
                                                {total > 0 ? formatCurrency(remaining) : <span className="text-slate-300">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                {total <= 0 ? (
                                                    <Badge variant="outline">Belum diatur</Badge>
                                                ) : (
                                                    <div className="space-y-1.5">
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
                                                        <UtilizationBar percent={percent} />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <Button
                                                    size="sm"
                                                    variant={dirty ? 'default' : 'outline'}
                                                    disabled={!dirty || savingId === id}
                                                    onClick={() => handleSave(id, row, allocation?.totalBudget)}
                                                >
                                                    <Save className="mr-1 h-3.5 w-3.5" />
                                                    {savingId === id ? 'Menyimpan…' : 'Simpan'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
