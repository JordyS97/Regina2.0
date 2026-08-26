'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { StatusTimeline } from '@/components/ui/status-timeline';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn, formatCurrency } from '@/lib/utils';
import { MOCK_GL_ACCOUNTS } from '@/lib/mock-data';
import { BUDGET_SOURCE_LABEL, type Proposal } from '@/lib/types';
import {
    formatDateTime,
    formatProposalNumber,
    getBottleneck,
    ROLE_LABEL,
    STATUS_LABEL,
    statusBadgeVariant,
} from '@/lib/proposal';
import {
    Building2,
    CalendarClock,
    Check,
    FileText,
    Landmark,
    Paperclip,
    Tag,
    User as UserIcon,
    Wallet,
    X,
} from 'lucide-react';

/** One labelled fact. Kept small so the grid below stays scannable. */
function Fact({
    label,
    value,
    icon: Icon,
    mono,
}: {
    label: string;
    value: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
                <p className={cn('text-sm text-slate-800 break-words', mono && 'font-mono text-xs')}>{value || '-'}</p>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
            {children}
        </section>
    );
}

/**
 * The full record of a single proposal, opened from any list that shows one.
 *
 * Every role that can see a proposal in a table needs to be able to read it
 * properly before acting on it — an amount and a title in a row is not enough
 * to approve a budget against.
 */
export function ProposalDetailModal({
    proposal,
    isOpen,
    onClose,
    actions,
}: {
    proposal: Proposal | null;
    isOpen: boolean;
    onClose: () => void;
    /** Approve/reject controls, supplied by the page that owns the decision. */
    actions?: React.ReactNode;
}) {
    if (!proposal) return null;

    const glAccount = MOCK_GL_ACCOUNTS.find((account) => account.code === proposal.glAccountCode);
    const items = proposal.items ?? [];
    const itemsTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const history = [...(proposal.history ?? [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detail Proposal"
            className="max-w-3xl"
        >
            <div className="max-h-[70vh] space-y-7 overflow-y-auto pr-1">
                {/* Identity ------------------------------------------------ */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1.5">
                        <p className="font-mono text-xs font-semibold text-astra-700">
                            {formatProposalNumber(proposal)}
                        </p>
                        <h2 className="text-lg font-bold leading-tight text-slate-900">{proposal.title}</h2>
                        {proposal.subtitle && (
                            <p className="text-sm text-slate-500">{proposal.subtitle}</p>
                        )}
                        {proposal.trackingId && (
                            <p className="text-[11px] text-slate-400">
                                ID Pelacakan: <span className="font-mono">{proposal.trackingId}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
                        <Badge variant={statusBadgeVariant(proposal.status)}>
                            {STATUS_LABEL[proposal.status] ?? proposal.status}
                        </Badge>
                        <span className="text-2xl font-bold tabular-nums text-slate-900">
                            {formatCurrency(proposal.amount)}
                        </span>
                        {proposal.status.startsWith('Pending') && (
                            <span className="text-[11px] text-slate-500">
                                Menunggu: {getBottleneck(proposal.status)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Approval chain ------------------------------------------ */}
                <Section title="Alur Persetujuan">
                    <div className="rounded-xl border border-slate-200 px-5 pb-9 pt-5">
                        <StatusTimeline
                            status={proposal.status}
                            skipRegionHead={proposal.skipRegionHeadApproval}
                        />
                    </div>
                </Section>

                {/* Facts ---------------------------------------------------- */}
                <Section title="Informasi Pengajuan">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                        <Fact
                            label="Pengaju"
                            icon={UserIcon}
                            value={proposal.submitterName || proposal.submitterId}
                        />
                        <Fact
                            label="Departemen"
                            icon={Building2}
                            value={proposal.submitterDepartment}
                        />
                        <Fact label="Dealer / SO" icon={Landmark} value={proposal.dealer} />
                        <Fact label="Tipe Pengajuan" icon={Tag} value={proposal.type} />
                        <Fact
                            label="Sumber Budget"
                            icon={Wallet}
                            value={proposal.budgetSource ? BUDGET_SOURCE_LABEL[proposal.budgetSource] : 'GL Account'}
                        />
                        <Fact
                            label="G/L Account"
                            icon={FileText}
                            mono
                            value={
                                proposal.glAccountCode
                                    ? `${proposal.glAccountCode}${glAccount ? ` — ${glAccount.name}` : ''}`
                                    : '-'
                            }
                        />
                        <Fact
                            label="Tanggal Pengajuan"
                            icon={CalendarClock}
                            value={formatDateTime(proposal.dateSubmitted)}
                        />
                        <Fact
                            label="Pembaruan Terakhir"
                            icon={CalendarClock}
                            value={formatDateTime(proposal.lastUpdated)}
                        />
                    </div>
                </Section>

                {/* Narrative ------------------------------------------------ */}
                {(proposal.background || proposal.description) && (
                    <Section title="Latar Belakang">
                        <p className="whitespace-pre-line rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
                            {proposal.background || proposal.description}
                        </p>
                    </Section>
                )}

                {/* Itemised costs ------------------------------------------- */}
                {items.length > 0 && (
                    <Section title="Rincian Biaya">
                        <div className="overflow-hidden rounded-xl border border-slate-200">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead className="text-right">Qty</TableHead>
                                        <TableHead className="text-right">Harga</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.map((item, index) => (
                                        <TableRow key={item.id || index}>
                                            <TableCell className="text-slate-800">
                                                {item.item || <span className="text-slate-400">Tanpa nama</span>}
                                                {item.m1 && (
                                                    <span className="ml-2 text-xs text-slate-400">({item.m1})</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                                            <TableCell className="text-right tabular-nums">{formatCurrency(item.price || 0)}</TableCell>
                                            <TableCell className="text-right font-medium tabular-nums">{formatCurrency(item.total || 0)}</TableCell>
                                        </TableRow>
                                    ))}
                                    <TableRow className="bg-slate-50">
                                        <TableCell colSpan={3} className="text-right text-sm font-semibold text-slate-600">
                                            Total Rincian
                                        </TableCell>
                                        <TableCell className="text-right font-bold tabular-nums text-slate-900">
                                            {formatCurrency(itemsTotal)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </Section>
                )}

                {/* Attachment ----------------------------------------------- */}
                <Section title="Lampiran">
                    {proposal.attachmentUrl ? (
                        <a
                            href={proposal.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-astra-200 bg-astra-50 px-3 py-2 text-sm font-medium text-astra-700 transition-colors duration-150 hover:bg-astra-100"
                        >
                            <Paperclip className="h-4 w-4" />
                            Buka dokumen pendukung
                        </a>
                    ) : (
                        <p className="text-sm text-slate-400">Tidak ada dokumen yang dilampirkan.</p>
                    )}
                </Section>

                {/* Audit trail ---------------------------------------------- */}
                <Section title="Riwayat Persetujuan">
                    {history.length === 0 ? (
                        <p className="text-sm text-slate-400">Belum ada riwayat tercatat.</p>
                    ) : (
                        <ol className="space-y-3">
                            {history.map((entry, index) => {
                                const isRejection = entry.action === 'Rejected';
                                const isApproval = entry.action === 'Approved';
                                return (
                                    <li key={`${entry.date}-${index}`} className="flex gap-3">
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                                                isRejection && 'bg-honda-50 text-honda-600',
                                                isApproval && 'bg-padi-50 text-padi-700',
                                                !isRejection && !isApproval && 'bg-astra-50 text-astra-700'
                                            )}
                                        >
                                            {isRejection ? (
                                                <X className="h-3.5 w-3.5" strokeWidth={3} />
                                            ) : isApproval ? (
                                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                            ) : (
                                                <FileText className="h-3.5 w-3.5" />
                                            )}
                                        </span>
                                        <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                                                <p className="text-sm font-medium text-slate-800">
                                                    {entry.action === 'Submitted'
                                                        ? 'Diajukan'
                                                        : isApproval
                                                            ? 'Disetujui'
                                                            : 'Ditolak'}{' '}
                                                    <span className="font-normal text-slate-500">
                                                        oleh {ROLE_LABEL[entry.byRole] ?? entry.byRole}
                                                    </span>
                                                </p>
                                                <span className="text-[11px] text-slate-400">{formatDateTime(entry.date)}</span>
                                            </div>
                                            {entry.comment && (
                                                <p
                                                    className={cn(
                                                        'mt-1.5 rounded border px-2 py-1 text-xs italic',
                                                        isRejection
                                                            ? 'border-honda-100 bg-honda-50 text-honda-700'
                                                            : 'border-slate-100 bg-slate-50 text-slate-600'
                                                    )}
                                                >
                                                    &ldquo;{entry.comment}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </Section>
            </div>

            {actions && (
                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                    {actions}
                </div>
            )}
        </Modal>
    );
}
