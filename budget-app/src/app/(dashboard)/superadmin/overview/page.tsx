'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { MOCK_GL_ACCOUNTS } from '@/lib/mock-data';
import { Proposal } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, DollarSign, Target, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { normalizeProposal } from '@/lib/proposals';

export default function OverviewPage() {
    const { user } = useAuth();
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!db) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(collection(db, 'proposals'), (snapshot) => {
            setProposals(snapshot.docs.map(d => normalizeProposal(d.id, d.data())));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching proposals:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    /**
     * Consumption per G/L account, derived from the proposals themselves.
     * `budgetUsed` in the seed data is only an opening balance — approved and
     * in-flight proposals are added on top so the health badges track reality.
     */
    const accounts = useMemo(() => {
        const drawnByCode = proposals.reduce((acc, p) => {
            if (p.status === 'Rejected' || !p.glAccountCode) return acc;
            acc[p.glAccountCode] = (acc[p.glAccountCode] || 0) + (Number(p.amount) || 0);
            return acc;
        }, {} as Record<string, number>);

        return MOCK_GL_ACCOUNTS.map(account => {
            const budgetUsed = account.budgetUsed + (drawnByCode[account.code] || 0);
            return {
                ...account,
                budgetUsed,
                budgetRemaining: Math.max(0, account.totalBudget - budgetUsed),
                drawnFromProposals: drawnByCode[account.code] || 0,
            };
        });
    }, [proposals]);

    if (!user) return null;

    if (user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Access Restricted. Super Admins only.</div>
            </div>
        );
    }

    const totalBudget = accounts.reduce((sum, acc) => sum + acc.totalBudget, 0);
    const totalUsed = accounts.reduce((sum, acc) => sum + acc.budgetUsed, 0);
    const totalRemaining = Math.max(0, totalBudget - totalUsed);
    const utilizedPercentage = totalBudget > 0 ? ((totalUsed / totalBudget) * 100).toFixed(1) : '0.0';

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">System Overview</h2>
                <p className="text-slate-500 mt-1">
                    {loading
                        ? 'Memuat konsumsi budget...'
                        : `Enterprise-wide budget consumption and health, termasuk ${proposals.length} proposal aktif.`}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-slate-900 text-white border-none shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Total Enterprise Budget</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{formatCurrency(totalBudget)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-800 text-white border-none shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Global Utilization</CardTitle>
                        <Activity className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{utilizedPercentage}%</div>
                    </CardContent>
                </Card>

                <Card className="bg-blue-600 text-white border-none shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-200">Budget Consumed</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{formatCurrency(totalUsed)}</div>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-600 text-white border-none shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-200">Total Remaining</CardTitle>
                        <Target className="h-4 w-4 text-emerald-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">{formatCurrency(totalRemaining)}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>G/L Accounts Detail</CardTitle>
                    <CardDescription>Breakdown of all General Ledger accounts in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account Code</TableHead>
                                    <TableHead>Department / Name</TableHead>
                                    <TableHead className="text-right">Total Budget</TableHead>
                                    <TableHead className="text-right">Used</TableHead>
                                    <TableHead className="text-right">Remaining</TableHead>
                                    <TableHead className="text-right">Health</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts.map((account) => {
                                    const utilization = account.totalBudget > 0
                                        ? (account.budgetUsed / account.totalBudget) * 100
                                        : 0;
                                    return (
                                        <TableRow key={account.code} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">{account.code}</TableCell>
                                            <TableCell className="font-medium text-slate-900">{account.name}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(account.totalBudget)}</TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(account.budgetUsed)}
                                                {account.drawnFromProposals > 0 && (
                                                    <div className="text-xs text-blue-600">
                                                        +{formatCurrency(account.drawnFromProposals)} dari proposal
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(account.budgetRemaining)}</TableCell>
                                            <TableCell className="text-right">
                                                {utilization > 90 ? (
                                                    <Badge variant="destructive">Critical</Badge>
                                                ) : utilization > 75 ? (
                                                    <Badge variant="warning">Warning</Badge>
                                                ) : (
                                                    <Badge variant="success">Healthy</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
