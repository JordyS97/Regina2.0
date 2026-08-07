'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { Proposal } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusTimeline } from '@/components/ui/status-timeline';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { DownloadCloud, Check, X, Clock, Paperclip } from 'lucide-react';
import { cn, formatCurrency, downloadCsv } from '@/lib/utils';
import {
    actionQueue,
    buildHistoryEntry,
    canActOn,
    displayTrackingId,
    formatDate,
    historyQueue,
    nextStatus,
    normalizeProposal,
    sortByRecent,
    visibleProposals,
} from '@/lib/proposals';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function ApprovalsPage() {
    const { user } = useAuth();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'action' | 'history'>('action');

    // Modal state
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
    const [rejectComment, setRejectComment] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!db) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(collection(db, 'proposals'), (snapshot) => {
            const fetched = snapshot.docs.map(d => normalizeProposal(d.id, d.data()));
            setProposals(sortByRecent(fetched));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching proposals:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const relevantProposals = useMemo(
        () => (user ? visibleProposals(proposals, user) : []),
        [proposals, user]
    );

    const actionRequiredProposals = useMemo(
        () => (user ? actionQueue(relevantProposals, user) : []),
        [relevantProposals, user]
    );

    const historyProposals = useMemo(
        () => (user ? historyQueue(relevantProposals, user) : []),
        [relevantProposals, user]
    );

    if (!user) return null;

    // SuperAdmins use different page
    if (user.role === 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Super Admins should use Proposal Tracking.</div>
            </div>
        );
    }

    const isAppraisalRole = user.role !== 'User';

    const displayProposals = user.role === 'User'
        ? relevantProposals
        : (activeTab === 'action' ? actionRequiredProposals : historyProposals);

    const handleDownload = () => {
        downloadCsv(
            `regina-approvals-${new Date().toISOString().slice(0, 10)}.csv`,
            ['No. Proposal', 'Judul', 'Tipe', 'Dealer', 'Pengaju', 'Sumber Budget', 'G/L Account', 'Nilai (Rp)', 'Status', 'Tanggal Pengajuan', 'Update Terakhir'],
            displayProposals.map(p => [
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
                formatDate(p.lastUpdated),
            ])
        );
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Approved': return <Badge variant="success">Approved</Badge>;
            case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
            default: return <Badge variant="warning">{status}</Badge>;
        }
    };

    const handleApprove = async (proposal: Proposal) => {
        if (!db) return;
        // Re-check against the live document: the queue may have moved on since render.
        if (!canActOn(proposal, user)) {
            alert("Proposal ini tidak lagi menunggu persetujuan Anda.");
            return;
        }
        setIsUpdating(true);
        try {
            const proposalRef = doc(db, 'proposals', proposal.id);
            await updateDoc(proposalRef, {
                status: nextStatus(proposal),
                lastUpdated: new Date().toISOString(),
                history: arrayUnion(buildHistoryEntry('Approved', user))
            });
        } catch (error) {
            console.error("Error approving proposal: ", error);
            alert("Gagal menyetujui proposal. Silakan coba lagi.");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleReject = async () => {
        if (!db || !selectedProposal) return;
        if (!canActOn(selectedProposal, user)) {
            alert("Proposal ini tidak lagi menunggu keputusan Anda.");
            setIsRejectModalOpen(false);
            setSelectedProposal(null);
            return;
        }
        setIsUpdating(true);
        try {
            const proposalRef = doc(db, 'proposals', selectedProposal.id);
            await updateDoc(proposalRef, {
                status: 'Rejected',
                lastUpdated: new Date().toISOString(),
                history: arrayUnion(buildHistoryEntry('Rejected', user, rejectComment))
            });
            setIsRejectModalOpen(false);
            setRejectComment('');
        } catch (error) {
            console.error("Error rejecting proposal: ", error);
            alert("Gagal menolak proposal. Silakan coba lagi.");
        } finally {
            setIsUpdating(false);
            setSelectedProposal(null);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                        {isAppraisalRole ? 'Budget Approvals' : 'My Requests Tracking'}
                    </h2>
                    <p className="text-slate-500 mt-1">
                        {isAppraisalRole ? 'Review and action pending budget proposals.' : 'Monitor the progress of your submitted budget proposals.'}
                    </p>
                </div>
                <Button
                    onClick={handleDownload}
                    disabled={displayProposals.length === 0}
                    variant="outline"
                    className="self-start sm:self-auto bg-white"
                >
                    <DownloadCloud className="mr-2 h-4 w-4" />
                    Export List (CSV)
                </Button>
            </div>

            {/* Tabs for Appraisal Roles */}
            {user.role !== 'User' && (
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setActiveTab('action')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            activeTab === 'action'
                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        )}
                    >
                        Action Required
                        {actionRequiredProposals.length > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                {actionRequiredProposals.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "px-4 py-2 text-sm font-medium rounded-md transition-all",
                            activeTab === 'history'
                                ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                        )}
                    >
                        History
                    </button>
                </div>
            )}

            {/* Data Table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[300px]">Proposal Info</TableHead>
                            <TableHead>Amount & G/L</TableHead>
                            <TableHead className="w-[400px]">Status Timeline</TableHead>
                            {activeTab === 'action' && user.role !== 'User' && (
                                <TableHead className="text-right">Actions</TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <span className="ml-2 text-slate-500">Loading proposals...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : displayProposals.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <Check className="h-8 w-8 text-slate-300 mb-2" />
                                        <p>All caught up! No proposals found.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            displayProposals.map((proposal) => (
                                <TableRow key={proposal.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-slate-900 truncate" title={proposal.title}>{proposal.title}</span>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">{displayTrackingId(proposal)}</span>
                                                <span>•</span>
                                                <span>{proposal.type}</span>
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {proposal.dealer}
                                                {proposal.submitterName ? ` — ${proposal.submitterName}` : ''}
                                            </div>
                                            <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                                                <span className="flex items-center">
                                                    <Clock className="mr-1 h-3 w-3" />
                                                    {formatDate(proposal.dateSubmitted)}
                                                </span>
                                                {proposal.attachmentUrl && (
                                                    <a
                                                        href={proposal.attachmentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center text-blue-600 hover:underline"
                                                    >
                                                        <Paperclip className="mr-1 h-3 w-3" />
                                                        Lampiran
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-slate-900">
                                                {formatCurrency(proposal.amount)}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {proposal.budgetSource ?? 'GL Account'}
                                                {proposal.glAccountCode ? ` • ${proposal.glAccountCode}` : ''}
                                            </span>
                                            {typeof proposal.currentBalance === 'number' && (
                                                <span className="text-xs text-slate-500">
                                                    Saldo: {formatCurrency(proposal.currentBalance)}
                                                </span>
                                            )}
                                            <div className="mt-1">
                                                {getStatusBadge(proposal.status)}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="py-4">
                                            {/* Timeline scales down to fit cell */}
                                            <StatusTimeline
                                                status={proposal.status}
                                                skipRegionHead={proposal.skipRegionHeadApproval}
                                                history={proposal.history}
                                            />
                                        </div>
                                        {/* Latest Comment (if rejected and looking at history) */}
                                        {proposal.status === 'Rejected' && proposal.history.find(h => h.action === 'Rejected')?.comment && (
                                            <div className="mt-2 text-xs italic text-red-600 bg-red-50 p-2 rounded border border-red-100">
                                                "{proposal.history.find(h => h.action === 'Rejected')?.comment}"
                                            </div>
                                        )}
                                    </TableCell>

                                    {activeTab === 'action' && user.role !== 'User' && (
                                        <TableCell className="text-right align-middle">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                                    disabled={isUpdating || !canActOn(proposal, user)}
                                                    onClick={() => {
                                                        setSelectedProposal(proposal);
                                                        setIsRejectModalOpen(true);
                                                    }}
                                                >
                                                    <X className="mr-1 h-4 w-4" /> Reject
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                                                    disabled={isUpdating || !canActOn(proposal, user)}
                                                    onClick={() => handleApprove(proposal)}
                                                >
                                                    <Check className="mr-1 h-4 w-4" /> Approve
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
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
                title="Reject Proposal"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        You are rejecting <strong className="text-slate-900">{selectedProposal?.title}</strong> for {selectedProposal ? formatCurrency(selectedProposal.amount) : ''}.
                        Please provide a reason.
                    </p>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-900">Rejection Reason <span className="text-red-500">*</span></label>
                        <textarea
                            required
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            className="w-full flex min-h-[100px] rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:border-red-500"
                            placeholder="E.g., Missing justifications, budget exceeded, etc."
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                        <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)} disabled={isUpdating}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={rejectComment.trim().length === 0 || isUpdating}
                        >
                            {isUpdating ? 'Submitting...' : 'Submit Rejection'}
                        </Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}
