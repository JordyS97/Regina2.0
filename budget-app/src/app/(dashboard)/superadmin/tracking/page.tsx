'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { Proposal } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusTimeline } from '@/components/ui/status-timeline';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import {
    bottleneckLabel,
    displayTrackingId,
    isPending,
    normalizeProposal,
    sortByRecent,
} from '@/lib/proposals';

export default function TrackingPage() {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

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

    const filteredProposals = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return proposals;
        return proposals.filter(p =>
            displayTrackingId(p).toLowerCase().includes(query) ||
            p.id.toLowerCase().includes(query) ||
            (p.dealer ?? '').toLowerCase().includes(query) ||
            (p.submitterName ?? '').toLowerCase().includes(query) ||
            p.title.toLowerCase().includes(query)
        );
    }, [proposals, searchQuery]);

    if (!user) return null;

    if (user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Access Restricted. Super Admins only.</div>
            </div>
        );
    }

    /**
     * Persists the Region Head bypass. Approvals routing reads this flag, so a
     * proposal already sitting at 'Pending Region' would be stranded by a late
     * switch — it is closed out instead.
     */
    const toggleRegionApproval = async (proposal: Proposal) => {
        if (!db) return;
        const skip = !proposal.skipRegionHeadApproval;
        setUpdatingId(proposal.id);
        try {
            const updates: Record<string, unknown> = {
                skipRegionHeadApproval: skip,
                lastUpdated: new Date().toISOString(),
            };
            if (skip && proposal.status === 'Pending Region') {
                updates.status = 'Approved';
            }
            await updateDoc(doc(db, 'proposals', proposal.id), updates);
        } catch (error) {
            console.error("Error updating region approval flag:", error);
            alert("Gagal memperbarui pengaturan approval Region Head.");
        } finally {
            setUpdatingId(null);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'Approved') return <Badge variant="success">Approved</Badge>;
        if (status === 'Rejected') return <Badge variant="destructive">Rejected</Badge>;
        return <Badge variant="warning">{status}</Badge>;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Proposal Tracking Matrix</h2>
                <p className="text-slate-500 mt-1">Override view to trace structural bottlenecks across the organization.</p>
            </div>

            <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <CardTitle>All Company Proposals</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Search by ID or Title..."
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
                                <TableHead className="pl-6">Proposal ID</TableHead>
                                <TableHead>Branch Dealer</TableHead>
                                <TableHead>Title & Amount</TableHead>
                                <TableHead>Current Status</TableHead>
                                <TableHead>Identified Bottleneck</TableHead>
                                <TableHead className="text-center">Region Approval</TableHead>
                                <TableHead className="pr-6 w-[350px]">Live Timeline Override</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                        Loading proposals...
                                    </TableCell>
                                </TableRow>
                            ) : filteredProposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                        {searchQuery
                                            ? `No proposals found matching "${searchQuery}"`
                                            : 'Belum ada proposal yang masuk ke sistem.'}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProposals.map((proposal) => (
                                    <TableRow key={proposal.id}>
                                        <TableCell className="pl-6 font-mono text-xs font-semibold whitespace-nowrap">
                                            {displayTrackingId(proposal)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-slate-700 whitespace-nowrap">{proposal.dealer}</div>
                                            {proposal.submitterName && (
                                                <div className="text-xs text-slate-500 whitespace-nowrap">{proposal.submitterName}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-slate-900">{proposal.title}</div>
                                            <div className="text-sm font-medium text-slate-600">{formatCurrency(proposal.amount)}</div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                                        <TableCell>
                                            {isPending(proposal.status) ? (
                                                <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
                                                    {bottleneckLabel(proposal.status)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs text-center block w-8">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button
                                                onClick={() => toggleRegionApproval(proposal)}
                                                disabled={updatingId === proposal.id}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${proposal.skipRegionHeadApproval ? 'bg-slate-300' : 'bg-blue-600'
                                                    }`}
                                                role="switch"
                                                aria-checked={!proposal.skipRegionHeadApproval}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${proposal.skipRegionHeadApproval ? 'translate-x-1' : 'translate-x-6'
                                                        }`}
                                                />
                                            </button>
                                            <div className="text-[10px] text-slate-500 mt-1 font-medium">
                                                {proposal.skipRegionHeadApproval ? 'Skipped' : 'Required'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-6 py-4 bg-slate-50/30">
                                            <div className="opacity-80 scale-90 origin-left">
                                                <StatusTimeline
                                                    status={proposal.status}
                                                    skipRegionHead={proposal.skipRegionHeadApproval}
                                                    history={proposal.history}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
