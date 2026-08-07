'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';
import { MOCK_GL_ACCOUNTS } from '@/lib/mock-data';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, Wallet, Sprout, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PageHeading, StatCard, UtilizationBar } from '@/components/ui/stat-card';

export default function OverviewPage() {
    const { user } = useAuth();

    if (!user) return null;

    if (user.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Akses terbatas. Khusus Super Admin.</div>
            </div>
        );
    }

    const totalBudget = MOCK_GL_ACCOUNTS.reduce((sum, acc) => sum + acc.totalBudget, 0);
    const totalUsed = MOCK_GL_ACCOUNTS.reduce((sum, acc) => sum + acc.budgetUsed, 0);
    const totalRemaining = totalBudget - totalUsed;
    const utilizedPercentage = ((totalUsed / totalBudget) * 100).toFixed(1);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <PageHeading
                title="Ikhtisar Sistem"
                description="Konsumsi dan kesehatan budget di seluruh organisasi."
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Total Budget Enterprise"
                    value={formatCurrency(totalBudget)}
                    hint={`${MOCK_GL_ACCOUNTS.length} G/L account terdaftar`}
                    icon={Wallet}
                    accent="ink"
                />
                <StatCard
                    label="Budget Terpakai"
                    value={formatCurrency(totalUsed)}
                    hint="Akumulasi seluruh G/L account"
                    icon={TrendingUp}
                    accent="astra"
                />
                <StatCard
                    label="Sisa Budget"
                    value={formatCurrency(totalRemaining)}
                    hint="Kapasitas yang masih tersedia"
                    icon={Sprout}
                    accent="padi"
                />
                <StatCard
                    label="Utilisasi Global"
                    value={`${utilizedPercentage}%`}
                    icon={Activity}
                    accent={Number(utilizedPercentage) > 90 ? 'honda' : 'bulir'}
                >
                    <UtilizationBar percent={Number(utilizedPercentage)} />
                </StatCard>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rincian G/L Account</CardTitle>
                    <CardDescription>Rincian seluruh General Ledger account dalam sistem.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kode Akun</TableHead>
                                    <TableHead>Departemen / Nama</TableHead>
                                    <TableHead className="text-right">Total Budget</TableHead>
                                    <TableHead className="text-right">Terpakai</TableHead>
                                    <TableHead className="text-right">Sisa</TableHead>
                                    <TableHead className="text-right">Kesehatan</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {MOCK_GL_ACCOUNTS.map((account) => {
                                    const utilization = (account.budgetUsed / account.totalBudget) * 100;
                                    return (
                                        <TableRow key={account.code} className="hover:bg-slate-50">
                                            <TableCell className="font-mono text-xs">{account.code}</TableCell>
                                            <TableCell className="font-medium text-slate-900">{account.name}</TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(account.totalBudget)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatCurrency(account.budgetUsed)}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatCurrency(account.budgetRemaining)}</TableCell>
                                            <TableCell className="text-right">
                                                {utilization > 90 ? (
                                                    <Badge variant="destructive">Kritis</Badge>
                                                ) : utilization > 75 ? (
                                                    <Badge variant="warning">Waspada</Badge>
                                                ) : (
                                                    <Badge variant="success">Sehat</Badge>
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
