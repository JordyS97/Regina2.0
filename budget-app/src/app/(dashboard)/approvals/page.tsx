'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Proposal, ProposalStatus } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusTimeline } from '@/components/ui/status-timeline';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import Link from 'next/link';
import { DownloadCloud, Check, X, Clock, Eye, Printer } from 'lucide-react';
import { PageHeading } from '@/components/ui/stat-card';
import { cn, formatCurrency } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { ProposalDetailModal } from '@/components/proposal/proposal-detail-modal';
import { useToast } from '@/components/ui/toast';
import { formatProposalNumber, STATUS_LABEL } from '@/lib/proposal';

export default function ApprovalsPage() {
    const { user } = useAuth();
    const { notify } = useToast();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'action' | 'history' | 'all'>('action');

    // Modal state
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Detail inspector — every role that can see a row can open the full record
    // behind it, so nobody has to approve a budget off a title and a number.
    const [detailProposal, setDetailProposal] = useState<Proposal | null>(null);

    // Download simulation
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
            // Sort by latest updated first
            fetchedProposals.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
            setProposals(fetchedProposals);
            // The open detail view is a live window, not a snapshot: re-point it
            // at the fresh document so an approval made here updates in place.
            setDetailProposal((current) =>
                current ? fetchedProposals.find((p) => p.id === current.id) ?? null : null
            );
            setLoading(false);
        }, (error) => {
            console.error("Error fetching proposals:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Guards come after every hook: an early return above one of them would
    // change the hook count between renders and crash React.
    if (!user) return null;

    // SuperAdmins use different page
    if (user.role === 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Super Admins should use Proposal Tracking.</div>
            </div>
        );
    }

    const isAppraisalRole = user.role !== 'User' && user.role !== 'Supervisor';

    // Determine relevant proposals for the user
    let relevantProposals = [...proposals];

    // If standard user, they just see their own generated stuff
    if (user.role === 'User') {
        relevantProposals = proposals.filter(p => p.submitterId === user.id);
    }

    // Filter based on tabs for Appraisal roles
    const actionRequiredProposals = relevantProposals.filter(p => {
        if (user.role === 'SubDeptHead') return p.status === 'Pending Sub Dept';
        if (user.role === 'FinanceHead') return p.status === 'Pending Finance';
        if (user.role === 'RegionHead') return p.status === 'Pending Region';
        if (user.role === 'Supervisor') return p.status === 'Pending Supervisor';
        return false;
    });

    const historyProposals = relevantProposals.filter(p => !actionRequiredProposals.includes(p));

    const displayProposals = user.role === 'User'
        ? relevantProposals
        : (activeTab === 'action' ? actionRequiredProposals : historyProposals);

    const handleDownload = () => {
        setIsDownloading(true);
        notify({
            title: 'Menyiapkan ekspor',
            description: 'Daftar persetujuan sedang disusun menjadi berkas CSV.',
            variant: 'info',
        });
        setTimeout(() => setIsDownloading(false), 2000);
    };

    const isActionable = (proposal: Proposal) => actionRequiredProposals.some(p => p.id === proposal.id);

    const getStatusBadge = (status: ProposalStatus) => {
        switch (status) {
            case 'Approved': return <Badge variant="success">Disetujui</Badge>;
            case 'Rejected': return <Badge variant="destructive">Ditolak</Badge>;
            default: return <Badge variant="warning">{STATUS_LABEL[status] ?? status}</Badge>;
        }
    };

    const proceedToNextStatus = (currentStatus: ProposalStatus): ProposalStatus => {
        switch (currentStatus) {
            case 'Pending Supervisor': return 'Pending Sub Dept';
            case 'Pending Sub Dept': return 'Pending Finance';
            case 'Pending Finance': return 'Pending Region';
            case 'Pending Region': return 'Approved';
            default: return currentStatus; // Shouldn't happen
        }
    };

    const handleApprove = async (proposal: Proposal) => {
        if (!db) return;
        setIsUpdating(true);
        try {
            const nextStatus = proceedToNextStatus(proposal.status);
            const proposalRef = doc(db, 'proposals', proposal.id);
            const newHistoryItem = {
                date: new Date().toISOString(),
                action: 'Approved' as const,
                byUserId: user.id,
                byRole: user.role
            };

            await updateDoc(proposalRef, {
                status: nextStatus,
                lastUpdated: new Date().toISOString(),
                history: arrayUnion(newHistoryItem)
            });

            notify({
                title: 'Proposal disetujui',
                description: nextStatus === 'Approved'
                    ? `${proposal.title} telah disetujui sepenuhnya.`
                    : `${proposal.title} diteruskan ke ${STATUS_LABEL[nextStatus] ?? nextStatus}.`,
                variant: 'success',
            });
        } catch (error) {
            console.error("Error approving proposal: ", error);
            notify({
                title: 'Gagal menyetujui',
                description: 'Perubahan tidak tersimpan. Periksa koneksi lalu coba lagi.',
                variant: 'error',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReject = async () => {
        if (!db || !selectedProposal) return;
        setIsUpdating(true);
        try {
            const proposalRef = doc(db, 'proposals', selectedProposal.id);
            const newHistoryItem = {
                date: new Date().toISOString(),
                action: 'Rejected' as const,
                byUserId: user.id,
                byRole: user.role,
                comment: rejectComment
            };

            await updateDoc(proposalRef, {
                status: 'Rejected',
                lastUpdated: new Date().toISOString(),
                history: arrayUnion(newHistoryItem)
            });
            setIsRejectModalOpen(false);
            setRejectComment('');
            notify({
                title: 'Proposal ditolak',
                description: `${selectedProposal.title} dikembalikan ke pengaju beserta alasannya.`,
                variant: 'warning',
            });
        } catch (error) {
            console.error("Error rejecting proposal: ", error);
            notify({
                title: 'Gagal menolak',
                description: 'Perubahan tidak tersimpan. Periksa koneksi lalu coba lagi.',
                variant: 'error',
            });
        } finally {
            setIsUpdating(false);
            setSelectedProposal(null);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <PageHeading
                title={isAppraisalRole ? 'Persetujuan Budget' : 'Pelacakan Pengajuan Saya'}
                description={
                    isAppraisalRole
                        ? 'Tinjau dan tindak lanjuti proposal budget yang menunggu keputusan Anda.'
                        : 'Pantau perkembangan proposal budget yang Anda ajukan.'
                }
                action={
                    <Button onClick={handleDownload} disabled={isDownloading} variant="outline" className="bg-white">
                        <DownloadCloud className="mr-2 h-4 w-4" />
                        {isDownloading ? 'Menyiapkan…' : 'Ekspor Daftar'}
                    </Button>
                }
            />

            {/* Tabs for Appraisal Roles */}
            {user.role !== 'User' && (
                <div className="flex w-fit space-x-1 rounded-lg bg-slate-100 p-1">
                    <button
                        onClick={() => setActiveTab('action')}
                        className={cn(
                            "rounded-md px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150",
                            activeTab === 'action'
                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5"
                                : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                        )}
                    >
                        Perlu Tindakan
                        {actionRequiredProposals.length > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-honda-100 px-2 py-0.5 text-xs font-bold text-honda-700">
                                {actionRequiredProposals.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "rounded-md px-4 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-150",
                            activeTab === 'history'
                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5"
                                : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                        )}
                    >
                        Riwayat
                    </button>
                </div>
            )}

            {/* Data Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Informasi Proposal</TableHead>
                            <TableHead>Nilai & G/L</TableHead>
                            <TableHead className="w-[400px]">Alur Persetujuan</TableHead>
                            <TableHead className="text-right">Tindakan</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    <div className="flex items-center justify-center">
                                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-astra-600" />
                                        <span className="ml-3 text-slate-500">Memuat proposal…</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : displayProposals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <Check className="mb-2 h-8 w-8 text-padi-300" />
                                        <p>Semua sudah tertangani. Tidak ada proposal di sini.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayProposals.map((proposal) => (
                                <TableRow key={proposal.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-slate-900 truncate" title={proposal.title}>{proposal.title}</span>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{formatProposalNumber(proposal)}</span>
                                                <span>•</span>
                                                <span>{proposal.type}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center mt-1">
                                                <Clock className="mr-1 h-3 w-3" />
                                                {new Date(proposal.dateSubmitted).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold tabular-nums text-slate-900">
                                                {formatCurrency(proposal.amount)}
                                            </span>
                                            <span className="text-xs font-mono text-slate-500">
                                                {proposal.glAccountCode}
                                            </span>
                                            <div className="mt-1">
                                                {getStatusBadge(proposal.status)}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="py-4">
                                            {/* Timeline scales down to fit cell */}
                                            <StatusTimeline status={proposal.status} />
                                        </div>
                                        {/* Latest Comment (if rejected and looking at history) */}
                                        {proposal.status === 'Rejected' && activeTab === 'history' && proposal.history.find(h => h.action === 'Rejected') && (
                                            <div className="mt-2 rounded border border-honda-100 bg-honda-50 p-2 text-xs italic text-honda-700">
                                                &ldquo;{proposal.history.find(h => h.action === 'Rejected')?.comment}&rdquo;
                                            </div>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-right align-middle">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDetailProposal(proposal)}
                                            >
                                                <Eye className="mr-1 h-4 w-4" /> Detail
                                            </Button>
                                            {/* Straight to the printable sheet, without
                                                going through the detail view first. */}
                                            <Link
                                                href={`/proposal/${proposal.id}/print`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button variant="outline" size="sm" title="Cetak / Simpan PDF">
                                                    <Printer className="mr-1 h-4 w-4" /> PDF
                                                </Button>
                                            </Link>
                                            {isActionable(proposal) && user.role !== 'User' && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-honda-200 text-honda-600 hover:bg-honda-50 hover:text-honda-700 disabled:opacity-50"
                                                        disabled={isUpdating}
                                                        onClick={() => {
                                                            setSelectedProposal(proposal);
                                                            setIsRejectModalOpen(true);
                                                        }}
                                                    >
                                                        <X className="mr-1 h-4 w-4" /> Tolak
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-padi-600 hover:bg-padi-700 disabled:opacity-50"
                                                        disabled={isUpdating}
                                                        onClick={() => handleApprove(proposal)}
                                                    >
                                                        <Check className="mr-1 h-4 w-4" /> Setujui
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Reject Comment Modal */}
            <Modal
                isOpen={isRejectModalOpen}
                onClose={() => setIsRejectModalOpen(false)}
                title="Tolak Proposal"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Anda akan menolak <strong className="text-slate-900">{selectedProposal?.title}</strong> senilai {selectedProposal ? formatCurrency(selectedProposal.amount) : ''}.
                        Mohon sertakan alasannya.
                    </p>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">Alasan Penolakan <span className="text-honda-600">*</span></label>
                        <textarea
                            required
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            className="w-full flex min-h-[100px] rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-honda-500/40 focus-visible:border-honda-500"
                            placeholder="Contoh: justifikasi kurang lengkap, melebihi pagu budget, dll."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                        <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)} disabled={isUpdating}>Batal</Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={rejectComment.trim().length === 0 || isUpdating}
                        >
                            {isUpdating ? 'Mengirim…' : 'Kirim Penolakan'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Full proposal record — the same view for every role, so an
                approver and the submitter are always reading the same page. */}
            <ProposalDetailModal
                proposal={detailProposal}
                isOpen={!!detailProposal}
                onClose={() => setDetailProposal(null)}
                actions={
                    detailProposal && isActionable(detailProposal) && user.role !== 'User' ? (
                        <>
                            <Button
                                variant="outline"
                                className="border-honda-200 text-honda-600 hover:bg-honda-50 hover:text-honda-700"
                                disabled={isUpdating}
                                onClick={() => {
                                    setSelectedProposal(detailProposal);
                                    setDetailProposal(null);
                                    setIsRejectModalOpen(true);
                                }}
                            >
                                <X className="mr-1 h-4 w-4" /> Tolak
                            </Button>
                            <Button
                                className="bg-padi-600 hover:bg-padi-700"
                                disabled={isUpdating}
                                onClick={() => handleApprove(detailProposal)}
                            >
                                <Check className="mr-1 h-4 w-4" /> Setujui
                            </Button>
                        </>
                    ) : undefined
                }
            />
        </div>
    );
}
