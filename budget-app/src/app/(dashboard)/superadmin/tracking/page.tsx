'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { MOCK_PROPOSALS } from '@/lib/mock-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusTimeline } from '@/components/ui/status-timeline';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';
import { PageHeading } from '@/components/ui/stat-card';

export default function TrackingPage() {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [proposals, setProposals] = React.useState(MOCK_PROPOSALS);

    // Guards sit below the hooks: returning above one changes the hook count
    // between renders and crashes React.
    if (!user || user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Akses terbatas. Khusus Super Admin.</div>
            </div>
        );
    }

    const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

    const generateProposalId = (proposal: any) => {
        // e.g., 'PROP-2024-001' -> '001'
        const propNum = proposal.id.split('-').pop();
        // e.g., 'H534-SO AMPENAN' -> 'H534'
        const dealerCode = proposal.dealer.split('-')[0];
        const date = new Date(proposal.dateSubmitted);
        const romanMonth = ROMAN_MONTHS[date.getMonth()];
        const year = date.getFullYear();

        return `MMC.${propNum}/${dealerCode}/${romanMonth}/${year}`;
    };

    const filteredProposals = proposals.filter(p =>
        generateProposalId(p).toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.dealer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleRegionApproval = (id: string) => {
        setProposals(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, skipRegionHeadApproval: !p.skipRegionHeadApproval };
            }
            return p;
        }));
    };

    const getStatusBadge = (status: string) => {
        if (status === 'Approved') return <Badge variant="success">Disetujui</Badge>;
        if (status === 'Rejected') return <Badge variant="destructive">Ditolak</Badge>;
        return <Badge variant="warning">{status}</Badge>;
    };

    const getBottleneck = (status: string) => {
        if (status === 'Pending Supervisor') return 'Supervisor Level';
        if (status === 'Pending Sub Dept') return 'Sub-Department Head';
        if (status === 'Pending Finance') return 'Finance Head';
        if (status === 'Pending Region') return 'Region Head';
        return '-';
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <PageHeading
                title="Matriks Pelacakan Proposal"
                description="Telusuri hambatan struktural di seluruh alur persetujuan organisasi."
            />

            <Card>
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                        <CardTitle>Seluruh Proposal Perusahaan</CardTitle>
                        <div className="relative w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                            <Input
                                placeholder="Cari berdasarkan ID atau judul…"
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
                                <TableHead className="pl-6">ID Proposal</TableHead>
                                <TableHead>Cabang Dealer</TableHead>
                                <TableHead>Judul & Nilai</TableHead>
                                <TableHead>Status Saat Ini</TableHead>
                                <TableHead>Hambatan Teridentifikasi</TableHead>
                                <TableHead className="text-center">Persetujuan Region</TableHead>
                                <TableHead className="w-[350px] pr-6">Alur Persetujuan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredProposals.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                                        Tidak ada proposal yang cocok dengan &ldquo;{searchQuery}&rdquo;
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredProposals.map((proposal) => (
                                    <TableRow key={proposal.id}>
                                        <TableCell className="pl-6 font-mono text-xs font-semibold whitespace-nowrap">
                                            {generateProposalId(proposal)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-slate-700 whitespace-nowrap">{proposal.dealer}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-semibold text-slate-900">{proposal.title}</div>
                                            <div className="text-sm font-medium tabular-nums text-slate-600">{formatCurrency(proposal.amount)}</div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(proposal.status)}</TableCell>
                                        <TableCell>
                                            {proposal.status.includes('Pending') ? (
                                                <span className="inline-flex items-center rounded-md bg-bulir-50 px-2 py-1 text-xs font-medium text-bulir-800 ring-1 ring-inset ring-bulir-300">
                                                    {getBottleneck(proposal.status)}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-xs text-center block w-8">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <button
                                                onClick={() => toggleRegionApproval(proposal.id)}
                                                className={cn(
                                                    'padi-press relative inline-flex h-6 w-11 items-center rounded-full',
                                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-astra-500 focus-visible:ring-offset-2',
                                                    proposal.skipRegionHeadApproval ? 'bg-slate-300' : 'bg-astra-600'
                                                )}
                                                role="switch"
                                                aria-checked={!proposal.skipRegionHeadApproval}
                                                aria-label={`Persetujuan Region untuk ${proposal.title}`}
                                            >
                                                <span
                                                    className={cn(
                                                        'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-strong',
                                                        proposal.skipRegionHeadApproval ? 'translate-x-1' : 'translate-x-6'
                                                    )}
                                                />
                                            </button>
                                            <div className="mt-1 text-[10px] font-medium text-slate-500">
                                                {proposal.skipRegionHeadApproval ? 'Dilewati' : 'Diperlukan'}
                                            </div>
                                        </TableCell>
                                        <TableCell className="pr-6 py-4 bg-slate-50/30">
                                            <StatusTimeline compact status={proposal.status} skipRegionHead={proposal.skipRegionHeadApproval} />
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
