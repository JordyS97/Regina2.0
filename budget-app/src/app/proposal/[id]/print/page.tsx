'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useProposal } from '@/hooks/use-proposal';
import { useUserDirectory } from '@/hooks/use-user-directory';
import { ProposalDocument } from '@/components/proposal/proposal-document';
import { PrintPortal, useAlwaysPrintable, usePrintSheet } from '@/components/proposal/print-sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';

/**
 * The proposal on its own page, ready for the printer.
 *
 * It lives outside the dashboard layout on purpose: no sidebar, no header, no
 * app chrome to fight the page margins. Browsers print to PDF from here, which
 * keeps the text selectable and the file small — an image-based export would
 * give neither.
 */
export default function ProposalPrintPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const { nameOf } = useUserDirectory();
    const print = usePrintSheet();

    // Ctrl+P should produce the same sheet as the button.
    useAlwaysPrintable();

    const { proposal, loading, error } = useProposal(id);

    if (authLoading) return null;

    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center text-slate-500">
                Silakan masuk terlebih dahulu untuk mencetak proposal.
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 py-8">
            {/* Toolbar — screen only. */}
            <div className="no-print mx-auto mb-6 flex max-w-[210mm] items-center justify-between gap-4 px-4">
                <Button variant="outline" onClick={() => router.back()} className="bg-white">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Kembali
                </Button>
                <div className="flex items-center gap-3">
                    <p className="hidden text-xs text-slate-500 sm:block">
                        Pilih &ldquo;Save as PDF&rdquo; pada dialog cetak untuk menyimpan sebagai PDF.
                    </p>
                    <Button onClick={print} disabled={!proposal}>
                        <Printer className="mr-2 h-4 w-4" />
                        Cetak / Simpan PDF
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex h-64 items-center justify-center text-slate-500">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-astra-600" />
                    <span className="ml-3">Memuat proposal…</span>
                </div>
            ) : error || !proposal ? (
                <div className="mx-auto max-w-md rounded-xl border border-honda-200 bg-honda-50 p-6 text-center text-sm text-honda-700">
                    {error ?? 'Proposal tidak ditemukan.'}
                </div>
            ) : (
                <>
                    {/* On-screen preview. Scrolls sideways on a narrow window
                        rather than reflowing, so it matches the printed sheet. */}
                    <div className="no-print overflow-x-auto px-4">
                        <div className="mx-auto w-fit shadow-lg ring-1 ring-slate-900/10">
                            <ProposalDocument proposal={proposal} resolveName={nameOf} />
                        </div>
                    </div>

                    {/* The copy that actually reaches the printer. */}
                    <PrintPortal>
                        <ProposalDocument proposal={proposal} resolveName={nameOf} />
                    </PrintPortal>
                </>
            )}
        </div>
    );
}
