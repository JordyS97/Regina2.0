'use client';

import React from 'react';
import { MOCK_GL_ACCOUNTS } from '@/lib/mock-data';
import { BUDGET_SOURCE_LABEL, type Proposal } from '@/lib/types';
import { formatDate, formatProposalNumber, STATUS_LABEL } from '@/lib/proposal';
import { resolveSignatures } from '@/lib/signature';
import { APP_LONG_NAME } from '@/lib/brand';
import { formatCurrency } from '@/lib/utils';

/**
 * A proposal that has not been saved yet still has a document — it just has no
 * number, no history, and therefore no signatures on file.
 */
export type DocumentProposal = Omit<Proposal, 'id'> & { id?: string };

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <tr>
            <td className="w-44 py-1 align-top text-slate-500">{label}</td>
            <td className="w-3 py-1 align-top text-slate-400">:</td>
            <td className="py-1 align-top font-medium text-slate-900">{value || '-'}</td>
        </tr>
    );
}

/**
 * The proposal as a sheet of paper.
 *
 * This is what gets printed or saved to PDF, so it is laid out in absolute
 * units rather than the screen's responsive scale — a document that reflows
 * with the viewport prints differently on every machine. Colour is kept to the
 * letterhead rule and the totals, because most of these come out of a mono
 * laser printer in a dealer back office.
 */
export function ProposalDocument({
    proposal,
    resolveName,
    isDraft = false,
}: {
    proposal: DocumentProposal;
    /** Turns a user id from the history into a printable name. */
    resolveName?: (userId: string) => string | undefined;
    /** A proposal still being composed: no number, no signatures yet. */
    isDraft?: boolean;
}) {
    const glAccount = MOCK_GL_ACCOUNTS.find((account) => account.code === proposal.glAccountCode);
    const items = (proposal.items ?? []).filter((item) => item.item || item.total);
    const itemsTotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const signatures = resolveSignatures(proposal, resolveName);

    const proposalNumber = proposal.id
        ? formatProposalNumber({ ...proposal, id: proposal.id })
        : 'DRAFT — belum bernomor';

    // Anything that is not fully approved is still a working document; saying so
    // on the page stops a half-signed printout being filed as a final one.
    const isFinal = proposal.status === 'Approved';

    return (
        <article className="padi-sheet mx-auto bg-white text-[11px] leading-relaxed text-slate-800">
            {/* Letterhead ------------------------------------------------- */}
            <header className="flex items-start justify-between gap-6">
                <div>
                    <p className="text-[15px] font-bold uppercase tracking-[0.14em] text-astra-800">
                        Astra Motor
                    </p>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                        Region Nusa Tenggara Barat
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">{proposal.dealer}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Nomor</p>
                    <p className="font-mono text-[11px] font-bold text-slate-900">{proposalNumber}</p>
                    <p className="mt-1 text-[10px] text-slate-500">
                        {formatDate(proposal.dateSubmitted)}
                    </p>
                </div>
            </header>

            <div aria-hidden="true" className="mt-3 flex h-[3px] overflow-hidden rounded-full">
                <span className="h-full flex-[4] bg-astra-600" />
                <span className="h-full flex-[2] bg-honda-600" />
                <span className="h-full flex-[3] bg-padi-500" />
                <span className="h-full flex-[2] bg-bulir-400" />
            </div>

            {/* Title ------------------------------------------------------- */}
            <div className="mt-6 text-center">
                <h1 className="text-[15px] font-bold uppercase tracking-[0.12em] text-slate-900">
                    Proposal Pengajuan Budget
                </h1>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    {APP_LONG_NAME}
                </p>
                {!isFinal && (
                    <p className="mt-2 inline-block rounded border border-bulir-300 bg-bulir-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-bulir-800">
                        {isDraft ? 'Draft — belum diajukan' : `Draft — ${STATUS_LABEL[proposal.status] ?? proposal.status}`}
                    </p>
                )}
            </div>

            {/* Particulars -------------------------------------------------- */}
            <section className="mt-6">
                <table className="w-full border-collapse">
                    <tbody>
                        <MetaRow label="Perihal" value={proposal.subtitle || proposal.title} />
                        <MetaRow label="Judul Proposal" value={proposal.title} />
                        <MetaRow label="Tipe Pengajuan" value={proposal.type} />
                        <MetaRow
                            label="Sumber Budget"
                            value={proposal.budgetSource ? BUDGET_SOURCE_LABEL[proposal.budgetSource] : 'GL Account'}
                        />
                        <MetaRow
                            label="G/L Account"
                            value={
                                proposal.glAccountCode
                                    ? `${proposal.glAccountCode}${glAccount ? ` — ${glAccount.name}` : ''}`
                                    : '-'
                            }
                        />
                        <MetaRow label="Dealer / Sales Office" value={proposal.dealer} />
                        <MetaRow
                            label="Diajukan oleh"
                            value={proposal.submitterName || (proposal.submitterId ? resolveName?.(proposal.submitterId) : '') || '-'}
                        />
                        <MetaRow label="Departemen" value={proposal.submitterDepartment || '-'} />
                    </tbody>
                </table>
            </section>

            {/* Background --------------------------------------------------- */}
            {(proposal.background || proposal.description) && (
                <section className="mt-6">
                    <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-900">
                        Latar Belakang
                    </h2>
                    <p className="whitespace-pre-line text-justify leading-[1.6] text-slate-700">
                        {proposal.background || proposal.description}
                    </p>
                </section>
            )}

            {/* Costs --------------------------------------------------------- */}
            <section className="mt-6">
                <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-900">
                    Rincian Biaya
                </h2>

                {items.length > 0 ? (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="w-8 border border-slate-300 px-2 py-1.5 text-center font-semibold">No</th>
                                <th className="border border-slate-300 px-2 py-1.5 text-left font-semibold">Uraian</th>
                                <th className="w-14 border border-slate-300 px-2 py-1.5 text-right font-semibold">Qty</th>
                                <th className="w-32 border border-slate-300 px-2 py-1.5 text-right font-semibold">Harga Satuan</th>
                                <th className="w-36 border border-slate-300 px-2 py-1.5 text-right font-semibold">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id || index}>
                                    <td className="border border-slate-300 px-2 py-1.5 text-center">{index + 1}</td>
                                    <td className="border border-slate-300 px-2 py-1.5">
                                        {item.item || '-'}
                                        {item.m1 && <span className="text-slate-500"> ({item.m1})</span>}
                                    </td>
                                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{item.qty}</td>
                                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{formatCurrency(item.price || 0)}</td>
                                    <td className="border border-slate-300 px-2 py-1.5 text-right tabular-nums">{formatCurrency(item.total || 0)}</td>
                                </tr>
                            ))}
                            <tr className="bg-slate-50">
                                <td colSpan={4} className="border border-slate-300 px-2 py-1.5 text-right font-bold">
                                    Total
                                </td>
                                <td className="border border-slate-300 px-2 py-1.5 text-right font-bold tabular-nums">
                                    {formatCurrency(itemsTotal)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                ) : (
                    <p className="text-slate-500">
                        Tidak ada rincian item. Nilai pengajuan mengacu pada total di bawah.
                    </p>
                )}

                <div className="mt-3 flex justify-end">
                    <div className="flex min-w-[280px] items-baseline justify-between gap-6 border-2 border-astra-700 px-3 py-2">
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-astra-800">
                            Total Pengajuan
                        </span>
                        <span className="text-[13px] font-bold tabular-nums text-slate-900">
                            {formatCurrency(proposal.amount || 0)}
                        </span>
                    </div>
                </div>
            </section>

            {/* Signatures ----------------------------------------------------
                Kept on one page: a signature block split across a page break is
                the one thing on this sheet that has to be signed as a unit. */}
            <section className="padi-signatures mt-10">
                <p className="mb-4 text-right text-[10px] text-slate-500">
                    {proposal.dealer?.split('-').slice(1).join('-').trim() || 'Mataram'},{' '}
                    {formatDate(proposal.dateSubmitted)}
                </p>

                <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${signatures.length}, minmax(0, 1fr))` }}
                >
                    {signatures.map((signature) => (
                        <div key={signature.title} className="text-center">
                            <p className="text-[10px] text-slate-600">{signature.action}</p>

                            {/* The space someone signs in. Fixed height so every
                                column lines up whether or not it is filled. */}
                            <div className="flex h-[62px] items-center justify-center">
                                {signature.signed && (
                                    <span className="text-[9px] font-medium uppercase tracking-wider text-padi-700">
                                        ✓ Disetujui&nbsp;di&nbsp;sistem
                                    </span>
                                )}
                            </div>

                            <div className="mx-auto w-full border-t border-slate-500 pt-1">
                                <p className="min-h-[14px] text-[10px] font-semibold text-slate-900">
                                    {signature.name || ' '}
                                </p>
                                <p className="text-[10px] text-slate-600">{signature.title}</p>
                                <p className="mt-0.5 min-h-[12px] text-[9px] text-slate-400">
                                    {signature.date ? formatDate(signature.date) : ' '}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <footer className="mt-8 border-t border-slate-200 pt-2 text-[9px] text-slate-400">
                Dicetak dari {APP_LONG_NAME} pada {formatDate(new Date().toISOString())}.
                {!isFinal && ' Dokumen ini belum berstatus final dan dapat berubah.'}
            </footer>
        </article>
    );
}
