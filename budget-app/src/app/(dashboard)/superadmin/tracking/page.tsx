'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusTimeline } from '@/components/ui/status-timeline';
import { Eye, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useProposals } from '@/hooks/use-proposals';
import { useToast } from '@/components/ui/toast';
import { ProposalDetailModal } from '@/components/proposal/proposal-detail-modal';
import { formatProposalNumber, getBottleneck, STATUS_LABEL, statusBadgeVariant } from '@/lib/proposal';
import type { Proposal } from '@/lib/types';

export default function TrackingPage() {
    const { user } = useAuth();
    const { notify } = useToast();
    const { proposals, loading, isSample, error } = useProposals();

    const [searchQuery, setSearchQuery] = useState('');
    const [detailProposal, setDetailProposal] = useState<Proposal | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    /** Overrides applied while Firebase is unavailable, so the switch still moves. */
    const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});

    const filteredProposals = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        if (!needle) return proposals;
        return proposals.filter((p) =>
            formatProposalNumber(p).toLowerCase().includes(needle) ||
            p.id.toLowerCase().includes(needle) ||
            p.dealer?.toLowerCase().includes(needle) ||
            p.title?.toLowerCase().includes(needle) ||
            p.submitterName?.toLowerCase().includes(needle)
        );
    }, [proposals, searchQuery]);

    // Guards sit below the hooks: returning above one changes the hook count
    // between renders and crashes React.
    if (!user || user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Akses terbatas. Khusus Super Admin.</div>
            </div>
        );
    }

    const skipsRegion = (proposal: Proposal) =>
        localOverrides[proposal.id] ?? proposal.skipRegionHeadApproval ?? false;

    const toggleRegionApproval = async (proposal: Proposal) => {
        const next = !skipsRegion(proposal);

        if (!db || isSample) {
            // No backend to write to — keep the switch responsive and say so.
            setLocalOverrides((prev) => ({ ...prev, [proposal.id]: next }));
            notify({
                title: 'Perubahan belum tersimpan',
                description: 'Firebase belum terhubung, jadi override ini hanya berlaku di browser ini.',
                variant: 'warning',
            });
            return;
        }

        setTogglingId(proposal.id);
        try {
            await updateDoc(doc(db, 'proposals', proposal.id), {
                skipRegionHeadApproval: next,
                lastUpdated: new Date().toISOString(),
            });
            notify({
                title: next ? 'Persetujuan Region dilewati' : 'Persetujuan Region diaktifkan',
                description: `${proposal.title} kini ${next ? 'tidak lagi' : 'kembali'} memerlukan tanda tangan Region Head.`,
                variant: next ? 'warning' : 'success',
            });
        } catch (err) {
            console.error('Error toggling region approval:', err);
            notify({
                title: 'Gagal mengubah alur',
                description: err instanceof Error ? err.message : 'Periksa koneksi lalu coba lagi.',
                variant: 'error',
            });
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Matriks Pelacakan Proposal</h2>
                <p className="text-slate-500 mt-1">
                    Telusuri hambatan struktural di seluruh organisasi, dan buka setiap proposal secara detail.
                </p>
            </div>

            {(isSample || error) && (
                <div className="rounded-xl border border-bulir-200 bg-bulir-50 px-4 py-3 text-sm text-bulir-800">
                    {error
                        ? `Firestore menolak permintaan: ${error}`
                        : 'Firebase belum dikonfigurasi — menampilkan data proposal contoh.'}
                </div>
            )}

            <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle>Seluruh Proposal Perusahaan</CardTitle>
                            <CardDescription>{filteredProposals.length} proposal ditampilkan.</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Cari nomor, judul, atau dealer…"
                                className="pl-9 bg-slate-50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow>
                                <TableHead className="pl-6">Nomor Proposal</TableHead>
                                <TableHead>Cabang Dealer</TableHead>
                                <TableHead>Judul & Nilai</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Hambatan</TableHead>
                                <TableHead className="text-center">Approval Region</TableHead>
                                <TableHead className="w-[320px]">Linimasa</TableHead>
                                <TableHead className="pr-6 text-right">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-28 text-center text-slate-500">
                                        <div className="flex items-center justify-center">
                                            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-astra-600" />
                                            <span className="ml-3">Memuat proposal…</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredProposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                                        Tidak ada proposal yang cocok dengan pencarian.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProposals.map((proposal) => {
                                    const skip = skipsRegion(proposal);
                                    return (
                                        <TableRow key={proposal.id}>
                                            <TableCell className="pl-6 font-mono text-xs font-semibold whitespace-nowrap">
                                                {formatProposalNumber(proposal)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-slate-700 whitespace-nowrap">{proposal.dealer}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-slate-900">{proposal.title}</div>
                                                <div className="text-sm font-medium text-slate-600">{formatCurrency(proposal.amount)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusBadgeVariant(proposal.status)}>
                                                    {STATUS_LABEL[proposal.status] ?? proposal.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {proposal.status.startsWith('Pending') ? (
                                                    <span className="inline-flex items-center rounded-md bg-bulir-50 px-2 py-1 text-xs font-medium text-bulir-800 ring-1 ring-inset ring-bulir-200">
                                                        {getBottleneck(proposal.status)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <button
                                                    onClick={() => toggleRegionApproval(proposal)}
                                                    disabled={togglingId === proposal.id}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-astra-500 focus:ring-offset-2 disabled:opacity-50 ${skip ? 'bg-slate-300' : 'bg-astra-600'
                                                        }`}
                                                    role="switch"
                                                    aria-checked={!skip}
                                                    aria-label="Persetujuan Region Head"
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${skip ? 'translate-x-1' : 'translate-x-6'
                                                            }`}
                                                    />
                                                </button>
                                                <div className="text-[10px] text-slate-500 mt-1 font-medium">
                                                    {skip ? 'Dilewati' : 'Diperlukan'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-6 bg-slate-50/30">
                                                <div className="opacity-80 scale-90 origin-left">
                                                    <StatusTimeline status={proposal.status} skipRegionHead={skip} />
                                                </div>
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
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
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
