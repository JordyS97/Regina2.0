'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MOCK_GL_ACCOUNTS } from '@/lib/mock-data';
import { useAuth } from '@/context/auth-context';
import { CheckCircle2, FileText, AlertTriangle, Paperclip, Plus, Trash2, UploadCloud, Printer } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Proposal, ProposalType, ItemizedCost, BudgetSource, BUDGET_SOURCE_LABEL, Dealer } from '@/lib/types';
import { PageHeading } from '@/components/ui/stat-card';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { ProposalDocument, type DocumentProposal } from '@/components/proposal/proposal-document';
import { PrintPortal, usePrintSheet } from '@/components/proposal/print-sheet';
import { useBudgetAllocations } from '@/hooks/use-budget-allocations';
import { useProposals } from '@/hooks/use-proposals';
import { budgetDocId, currentBudgetPeriod, usageFor } from '@/lib/budget';
import * as XLSX from 'xlsx';

/** Sources that draw against a known balance, so the form can warn on overspend. */
const BALANCE_BACKED: BudgetSource[] = ['GL Account', 'Added Fee'];

// TODO: derive from the signed-in user once dealer is populated on their profile.
const DEFAULT_DEALER: Dealer = 'H531-SO BIMA';

export default function SubmissionPage() {
    const { user } = useAuth();
    const { notify } = useToast();
    const printSheet = usePrintSheet();
    const [isDraftOpen, setIsDraftOpen] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Core Form states
    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [background, setBackground] = useState('');
    const [type, setType] = useState<ProposalType | ''>('');
    const [budgetSource, setBudgetSource] = useState<BudgetSource>('GL Account');
    const [glAccount, setGlAccount] = useState('');

    // Amounts & Tables
    const [amount, setAmount] = useState<number>(0);
    const [items, setItems] = useState<ItemizedCost[]>([{ id: '1', item: '', qty: 1, price: 0, total: 0, m1: '' }]);
    const [currentBalance, setCurrentBalance] = useState<number | ''>('');

    // Files
    const [file, setFile] = useState<File | null>(null); // Main PDF/Docs
    const [excelFile, setExcelFile] = useState<File | null>(null); // For Added Fee
    const [excelError, setExcelError] = useState('');

    // --- Budget ceilings set by the Super Admin ---------------------------
    const period = currentBudgetPeriod();
    const { allocations } = useBudgetAllocations(period);
    const { proposals } = useProposals();

    // Only this year's proposals draw against this year's pagu.
    const periodProposals = useMemo(
        () => proposals.filter(p => new Date(p.dateSubmitted).getFullYear() === Number(period)),
        [proposals, period]
    );

    /** The pagu for the chosen G/L account, or null when none has been set. */
    const glCeiling = useMemo(() => {
        if (budgetSource !== 'GL Account' || !glAccount) return null;
        const allocation = allocations[budgetDocId('GLAccount', glAccount, period)];
        if (!allocation?.totalBudget) return null;
        const usage = usageFor(periodProposals, p => p.glAccountCode === glAccount);
        return {
            total: allocation.totalBudget,
            used: usage.committed,
            remaining: allocation.totalBudget - usage.committed,
        };
    }, [budgetSource, glAccount, allocations, periodProposals, period]);

    /**
     * The form's current contents as a document.
     *
     * A draft has no id and no history, so it prints with all four signature
     * spaces blank — which is the point: this is the sheet that goes round for
     * wet signatures before anything is submitted.
     */
    const draftProposal = useMemo<DocumentProposal>(() => {
        const now = new Date().toISOString();
        return {
            title,
            subtitle,
            background,
            description: background,
            type: (type || 'Lain-lain') as ProposalType,
            amount,
            budgetSource,
            glAccountCode: budgetSource === 'GL Account' ? glAccount : '',
            items: budgetSource === 'GL Account' ? items : [],
            dealer: user?.dealer ?? DEFAULT_DEALER,
            status: 'Pending Supervisor',
            submitterId: user?.id ?? '',
            submitterName: user?.name,
            submitterDepartment: user?.department,
            dateSubmitted: now,
            lastUpdated: now,
            history: [],
        };
    }, [title, subtitle, background, type, amount, budgetSource, glAccount, items, user]);

    /** The pagu for the submitter's own sales office, if one has been set. */
    const dealerCeiling = useMemo(() => {
        const dealer = user?.dealer;
        if (!dealer) return null;
        const allocation = allocations[budgetDocId('Dealer', dealer, period)];
        if (!allocation?.totalBudget) return null;
        const usage = usageFor(periodProposals, p => p.dealer === dealer);
        return {
            dealer,
            total: allocation.totalBudget,
            used: usage.committed,
            remaining: allocation.totalBudget - usage.committed,
        };
    }, [user?.dealer, allocations, periodProposals, period]);

    // --- Dynamic Table Logic (For GL Account) ---
    const handleItemChange = (index: number, field: keyof ItemizedCost, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-calculate row total
        if (field === 'qty' || field === 'price') {
            newItems[index].total = (newItems[index].qty || 0) * (newItems[index].price || 0);
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { id: Date.now().toString(), item: '', qty: 1, price: 0, total: 0, m1: '' }]);
    };

    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    // Recalculate global amount whenever items change
    useEffect(() => {
        const sum = items.reduce((acc, curr) => acc + (curr.total || 0), 0);
        setAmount(sum);
    }, [items]);

    useEffect(() => {
        if (!BALANCE_BACKED.includes(budgetSource)) {
            setCurrentBalance('');
        }
    }, [budgetSource]);

    // A centrally-set pagu is the authority on what is left, so the balance
    // field stops being a number the submitter types from memory.
    useEffect(() => {
        if (glCeiling) {
            setCurrentBalance(Math.max(0, glCeiling.remaining));
        }
    }, [glCeiling]);

    // Access restriction. It sits below every hook on purpose — an early
    // return above one changes the hook count between renders and crashes React.
    if (!user || (user.role !== 'User' && user.role !== 'Supervisor')) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Anda tidak memiliki akses ke halaman ini.</div>
            </div>
        );
    }

    // --- Excel Parsing Logic (For Added Fee) ---
    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setExcelError('');
        if (!file) {
            setExcelFile(null);
            setCurrentBalance('');
            return;
        }

        setExcelFile(file);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                let sum = 0;
                let foundJumlah = false;

                data.forEach((row: any) => {
                    // Try to find a key that closely matches "JUMLAH" (case insensitive)
                    const keys = Object.keys(row);
                    const jumlahKey = keys.find(k => k.trim().toUpperCase() === 'JUMLAH');

                    if (jumlahKey) {
                        foundJumlah = true;
                        const val = row[jumlahKey];

                        // Parse numbers even if they have thousands separators like dots or commas
                        if (typeof val === 'number') {
                            sum += val;
                        } else if (typeof val === 'string') {
                            // Strip out any non-digit character except decimal points if localized differently
                            // Assuming '1.500.000' format where dots are thousands separators
                            const cleaned = val.replace(/\./g, '').replace(/,/g, '');
                            const parsed = parseInt(cleaned, 10);
                            if (!isNaN(parsed)) {
                                sum += parsed;
                            }
                        }
                    }
                });

                if (!foundJumlah) {
                    setExcelError('Kolom "JUMLAH" tidak ditemukan pada file yang diunggah.');
                    setCurrentBalance('');
                } else {
                    setCurrentBalance(sum);
                }
            } catch (err) {
                console.error("Error parsing Excel:", err);
                setExcelError('Gagal membaca file. Pastikan formatnya Excel/CSV yang valid.');
                setCurrentBalance('');
            }
        };
        reader.readAsBinaryString(file);
    };

    // --- Submission Logic ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation based on type
        const requiresPDF = type === 'Perbaikan AC / mobil / motor / asset lain' || type === 'Sewa Gudang';
        if (requiresPDF && !file) {
            notify({
                title: 'Dokumen pendukung belum dilampirkan',
                description: 'Tipe pengajuan ini wajib melampirkan dokumen/PDF pendukung.',
                variant: 'warning',
            });
            return;
        }

        if (budgetSource === 'GL Account' && !glAccount) {
            notify({
                title: 'G/L Account belum dipilih',
                description: 'Pilih G/L Account terlebih dahulu sebelum mengirim pengajuan.',
                variant: 'warning',
            });
            return;
        }

        if (amount <= 0) {
            notify({
                title: 'Nilai pengajuan belum diisi',
                description: 'Total pengajuan harus lebih besar dari 0.',
                variant: 'warning',
            });
            return;
        }

        if (BALANCE_BACKED.includes(budgetSource) && typeof currentBalance === 'number' && amount > currentBalance) {
            notify({
                title: 'Melebihi saldo budget',
                description: 'Nilai pengajuan melebihi saldo budget yang tersedia.',
                variant: 'error',
            });
            return;
        }

        if (dealerCeiling && amount > dealerCeiling.remaining) {
            notify({
                title: 'Melebihi pagu Sales Office',
                description: `Sisa pagu ${dealerCeiling.dealer} tinggal ${formatCurrency(Math.max(0, dealerCeiling.remaining))}.`,
                variant: 'error',
            });
            return;
        }

        try {
            setIsSubmitting(true);
            let attachmentUrl: string | null = null;

            // Upload main supporting file
            if (file && storage) {
                const fileRef = ref(storage, `proposals/${Date.now()}_${file.name}`);
                const uploadResult = await uploadBytes(fileRef, file);
                attachmentUrl = await getDownloadURL(uploadResult.ref);
            }

            // (Optional) Could also upload the excelFile if needed, omitting for now unless required

            if (db) {
                const trackingId = `P${new Date().getFullYear()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
                const now = new Date().toISOString();

                // This payload has to satisfy the same Proposal shape the
                // dashboard and approvals screens read back. An earlier version
                // wrote `submittedBy` and a `{status, actor}` history and never
                // wrote dateSubmitted/lastUpdated at all, so submitted proposals
                // sorted as NaN, grouped under "Invalid Date", and never matched
                // the `submitterId === user.id` filter on the tracking view.
                const payload: Omit<Proposal, 'id'> & { createdAt: unknown } = {
                    trackingId,
                    title,
                    subtitle,
                    background,
                    description: background,
                    type: type as ProposalType,
                    amount,
                    budgetSource,
                    glAccountCode: budgetSource === 'GL Account' ? glAccount : '',
                    items: budgetSource === 'GL Account' ? items : [],
                    dealer: user.dealer ?? DEFAULT_DEALER,
                    status: 'Pending Supervisor',
                    submitterId: user.id || 'unknown',
                    submitterName: user.name,
                    submitterDepartment: user.department,
                    dateSubmitted: now,
                    lastUpdated: now,
                    history: [
                        {
                            date: now,
                            action: 'Submitted',
                            byUserId: user.id || 'unknown',
                            byRole: user.role,
                        }
                    ],
                    attachmentUrl,
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'proposals'), payload);
            }

            setIsSubmitted(true);
            notify({
                title: 'Proposal terkirim',
                description: `${title} kini menunggu persetujuan Supervisor.`,
                variant: 'success',
            });
            setTimeout(() => {
                setIsSubmitted(false);
                // Reset form
                setTitle(''); setSubtitle(''); setBackground(''); setType('');
                setGlAccount(''); setAmount(0); setCurrentBalance('');
                setItems([{ id: '1', item: '', qty: 1, price: 0, total: 0, m1: '' }]);
                setFile(null); setExcelFile(null); setExcelError('');
            }, 3000);
        } catch (error) {
            console.error("Error submitting proposal:", error);
            notify({
                title: 'Gagal mengirim proposal',
                description: 'Pastikan koneksi dan konfigurasi Firebase sudah benar, lalu coba lagi.',
                variant: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const exceedsBalance = BALANCE_BACKED.includes(budgetSource) && typeof currentBalance === 'number' && amount > currentBalance;
    const exceedsDealerPagu = !!dealerCeiling && amount > dealerCeiling.remaining;
    // Either ceiling blocks the submission — the SO pagu applies regardless of
    // which budget source the proposal draws on.
    const isExceeding = exceedsBalance || exceedsDealerPagu;
    const remainingAfter = BALANCE_BACKED.includes(budgetSource) && typeof currentBalance === 'number' ? currentBalance - amount : null;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <PageHeading
                title="Form Pengajuan Proposal"
                description="Isi formulir pengajuan budget lengkap dengan rincian biaya."
            />

            <Card className="shadow-sm border-slate-200">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-6 rounded-t-xl">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <FileText className="h-5 w-5 text-astra-600" />
                            Proposal Details
                        </CardTitle>
                        <CardDescription>
                            Proposal akan diteruskan secara otomatis ke atasan (Supervisor) Anda untuk di-review.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-8 pt-6">
                        {/* Section 1: Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-900">Judul Proposal (Title) <span className="text-honda-600">*</span></label>
                                <Input required placeholder="Contoh: Proposal Showroom Event Q3" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-900">Perihal (Subtitle) <span className="text-honda-600">*</span></label>
                                <Input required placeholder="Masukkan perihal proposal..." value={subtitle} onChange={e => setSubtitle(e.target.value)} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-900">Latar Belakang (Background) <span className="text-honda-600">*</span></label>
                                <textarea
                                    required
                                    value={background}
                                    onChange={e => setBackground(e.target.value)}
                                    className="w-full flex min-h-[80px] rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-astra-500/40 focus-visible:border-astra-500 italic text-slate-700"
                                    placeholder="(MENJELASKAN MAKSUD DAN TUJUAN DARI PENGAJUAN PROPOSAL)"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-900">Tipe Proposal <span className="text-honda-600">*</span></label>
                                <Select
                                    required
                                    value={type}
                                    onChange={e => setType(e.target.value as ProposalType)}
                                    options={[
                                        { label: 'Pilih tipe pengajuan...', value: '' },
                                        { label: 'Peralatan Kantor/ATK', value: 'Peralatan Kantor/ATK' },
                                        { label: 'Event Dealer (Showroom Event, Yasinan, dll)', value: 'Event Dealer (Showroom Event, Yasinan, dll)' },
                                        { label: 'Memo Internal (AMIC)', value: 'Memo Internal (AMIC)' },
                                        { label: 'Pembelian Air Konsumen', value: 'Pembelian Air Konsumen' },
                                        { label: 'Sewa Gudang', value: 'Sewa Gudang' },
                                        { label: 'Perbaikan AC / mobil / motor / asset lain', value: 'Perbaikan AC / mobil / motor / asset lain' },
                                        { label: 'Pengajuan Matprom', value: 'Pengajuan Matprom' },
                                        { label: 'Pembelian Paket Data', value: 'Pembelian Paket Data' },
                                        { label: 'Lain-lain', value: 'Lain-lain' },
                                    ]}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-900">Sumber Budget <span className="text-honda-600">*</span></label>
                                <Select
                                    required
                                    value={budgetSource}
                                    onChange={e => setBudgetSource(e.target.value as BudgetSource)}
                                    options={[
                                        { label: BUDGET_SOURCE_LABEL['GL Account'], value: 'GL Account' },
                                        { label: BUDGET_SOURCE_LABEL['Added Fee'], value: 'Added Fee' },
                                        { label: BUDGET_SOURCE_LABEL['Retail JoinProm'], value: 'Retail JoinProm' },
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Section 2: Budget Source Dynamic Engine */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6 space-y-6">

                            {/* --- SCENARIO A: GL ACCOUNT --- */}
                            {budgetSource === 'GL Account' && (
                                <div className="padi-enter space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-900">Pilih G/L Account Code <span className="text-honda-600">*</span></label>
                                            <Select
                                                required
                                                value={glAccount}
                                                onChange={e => setGlAccount(e.target.value)}
                                                options={[
                                                    { label: 'Select G/L Account...', value: '' },
                                                    ...MOCK_GL_ACCOUNTS.map(gl => ({
                                                        // Hidden Global Available text as per request #2
                                                        label: `${gl.code} - ${gl.name}`,
                                                        value: gl.code
                                                    }))
                                                ]}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-900">Saldo Budget Saat Ini (Rp) <span className="text-honda-600">*</span></label>
                                            <Input
                                                required
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="Contoh: 15000000"
                                                value={currentBalance}
                                                readOnly={!!glCeiling}
                                                className={glCeiling ? 'bg-slate-100 text-slate-600' : undefined}
                                                onChange={(e) => setCurrentBalance(e.target.value ? Number(e.target.value) : '')}
                                            />
                                            <p className="text-xs text-slate-500">
                                                {glCeiling
                                                    ? `Terisi otomatis dari pagu ${formatCurrency(glCeiling.total)} yang ditetapkan Super Admin, dikurangi ${formatCurrency(glCeiling.used)} yang sudah terpakai.`
                                                    : 'Pagu G/L account ini belum ditetapkan Super Admin — isikan saldo terakhir secara manual.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* The submitter's own SO ceiling applies whatever the
                                budget source is, so it is shown outside the
                                per-source panels. */}
                            {dealerCeiling && (
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                Pagu {dealerCeiling.dealer} · {period}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Terpakai {formatCurrency(dealerCeiling.used)} dari {formatCurrency(dealerCeiling.total)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[11px] uppercase tracking-wide text-slate-400">Sisa pagu</p>
                                            <p className={`text-lg font-bold tabular-nums ${dealerCeiling.remaining - amount < 0 ? 'text-honda-600' : 'text-slate-900'}`}>
                                                {formatCurrency(Math.max(0, dealerCeiling.remaining))}
                                            </p>
                                        </div>
                                    </div>
                                    {amount > 0 && amount > dealerCeiling.remaining && (
                                        <p className="mt-3 flex items-center gap-2 rounded-lg border border-honda-100 bg-honda-50 px-3 py-2 text-xs font-medium text-honda-700">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            Pengajuan ini melebihi sisa pagu Sales Office sebesar {formatCurrency(amount - dealerCeiling.remaining)}.
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* --- SCENARIO B: ADDED FEE --- */}
                            {budgetSource === 'Added Fee' && (
                                <div className="padi-enter space-y-6 rounded-xl border-2 border-dashed border-astra-200 bg-white p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="shrink-0 rounded-lg bg-astra-50 p-3 text-astra-600">
                                            <UploadCloud className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-4 flex-1">
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-900">Upload Lampiran Excel (.xlsx / .csv)</h3>
                                                <p className="text-sm text-slate-500 mt-1">
                                                    Sistem akan secara otomatis membaca total nilai dari kolom bernama <span className="font-mono font-bold text-slate-700">JUMLAH</span> untuk Budget Tersedia.
                                                </p>
                                            </div>
                                            <Input
                                                type="file"
                                                accept=".xlsx, .xls, .csv"
                                                required
                                                onChange={handleExcelUpload}
                                                className="cursor-pointer text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-astra-600 file:px-4 file:py-1 file:font-semibold file:text-white hover:file:bg-astra-700"
                                            />
                                            {excelError && (
                                                <p className="flex items-center gap-1.5 text-sm font-medium text-honda-600"><AlertTriangle className="w-4 h-4" /> {excelError}</p>
                                            )}
                                        </div>
                                    </div>
                                    {typeof currentBalance === 'number' && (
                                        <div className="flex items-center justify-between rounded-lg border border-astra-200 bg-astra-50/60 p-4">
                                            <span className="text-sm font-semibold text-slate-700 text-right w-full pr-4">Total Budget Available dari Excel:</span>
                                            <span className="font-mono text-xl font-bold text-slate-900 shrink-0">{formatCurrency(currentBalance)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- SCENARIO C: RETAIL JOINPROM --- */}
                            {budgetSource === 'Retail JoinProm' && (
                                <div className="padi-enter flex items-center gap-3 rounded-xl border border-astra-200 bg-astra-50 p-5">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 text-astra-600" />
                                    <div>
                                        <h3 className="text-sm font-bold text-astra-900">Retail JoinProm Terpilih</h3>
                                        <p className="mt-0.5 text-xs text-astra-700">Silakan tambahkan item kebutuhan pada tabel Rincian Biaya Pengajuan di bawah ini.</p>
                                    </div>
                                </div>
                            )}

                            {/* UNIVERSAL TABLE FOR ALL BUDGET SOURCES */}
                            <div className="space-y-5 pt-6 border-t border-slate-200 mt-8">
                                <div className="flex items-center justify-between">
                                    <label className="text-base font-bold text-slate-900">Rincian Biaya Pengajuan:</label>
                                </div>
                                <div className="border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm transition-all">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 text-xs uppercase tracking-wider text-center">
                                                <tr>
                                                    <th className="px-3 py-3 w-12 border-r border-slate-300">NO</th>
                                                    <th className="px-4 py-3 border-r border-slate-300 w-1/3 text-left">ITEM</th>
                                                    <th className="px-3 py-3 border-r border-slate-300 w-24">QTY</th>
                                                    <th className="px-4 py-3 border-r border-slate-300 w-40">HARGA SATUAN</th>
                                                    <th className="px-4 py-3 border-r border-slate-300 w-40">TOTAL</th>
                                                    <th className="px-4 py-3 border-r border-slate-300 w-24">M-1</th>
                                                    <th className="px-3 py-3 w-12 text-center"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items.map((item, idx) => (
                                                    <tr key={item.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50 transition-colors">
                                                        <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-500 font-medium">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="p-0 border-r border-slate-200">
                                                            <input
                                                                type="text"
                                                                required
                                                                className="w-full h-10 px-3 outline-none bg-transparent focus:bg-astra-50/60"
                                                                value={item.item}
                                                                placeholder="Nama barang / jasa"
                                                                onChange={(e) => handleItemChange(idx, 'item', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="p-0 border-r border-slate-200">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                required
                                                                className="w-full h-10 px-3 text-center outline-none bg-transparent focus:bg-astra-50/60"
                                                                value={item.qty || ''}
                                                                onChange={(e) => handleItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                                                            />
                                                        </td>
                                                        <td className="p-0 border-r border-slate-200 relative">
                                                            <span className="absolute left-3 top-2.5 text-slate-400 text-xs">Rp</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                required
                                                                className="w-full h-10 pl-8 pr-3 text-right outline-none bg-transparent focus:bg-astra-50/60"
                                                                value={item.price || ''}
                                                                onChange={(e) => handleItemChange(idx, 'price', parseInt(e.target.value) || 0)}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-2 border-r border-slate-200 text-right font-semibold text-slate-700 bg-slate-50/50">
                                                            {formatCurrency(item.total).replace('Rp', '')}
                                                        </td>
                                                        <td className="p-0 border-r border-slate-200">
                                                            <input
                                                                type="text"
                                                                className="w-full h-10 px-3 text-center outline-none bg-transparent focus:bg-astra-50/60"
                                                                value={item.m1}
                                                                onChange={(e) => handleItemChange(idx, 'm1', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 text-center">
                                                            {items.length > 1 && (
                                                                <button type="button" onClick={() => removeItem(idx)} className="rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-honda-50 hover:text-honda-600">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Table Footer Totals */}
                                                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                                                    <td colSpan={4} className="px-4 py-3 text-right uppercase tracking-wider">TOTAL PERMINTAAN DANA</td>
                                                    <td className="px-4 py-3 text-right border-x border-slate-300 text-astra-700">{formatCurrency(amount).replace('Rp', '')}</td>
                                                    <td colSpan={2}></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-white p-2 border-t border-slate-200 flex justify-center">
                                        <Button type="button" variant="ghost" size="sm" onClick={addItem} className="w-full rounded-md border border-dashed border-astra-200 text-astra-600 hover:bg-astra-50 hover:text-astra-700">
                                            <Plus className="w-4 h-4 mr-2" /> Tambah Baris
                                        </Button>
                                    </div>
                                </div>

                                {/* Preview Check for Budget Balances */}
                                {remainingAfter !== null && (
                                    <div className={`padi-enter flex items-center justify-between rounded-xl border p-4 ${isExceeding ? 'border-honda-200 bg-honda-50' : 'border-padi-200 bg-padi-50'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-slate-700">Estimasi Sisa Saldo:</span>
                                            <span className={`font-mono text-lg font-bold tabular-nums ${isExceeding ? 'text-honda-700' : 'text-padi-800'}`}>{formatCurrency(remainingAfter)}</span>
                                        </div>
                                        <div>
                                            {isExceeding ? (
                                                <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1"><AlertTriangle className="w-4 h-4" /> Dana Tidak Mencukupi</Badge>
                                            ) : (
                                                <Badge variant="success" className="flex items-center gap-1.5 px-3 py-1"><CheckCircle2 className="w-4 h-4" /> Saldo Aman</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 3: Universal Supporting Document */}
                        <div className="space-y-3 pt-6 border-t border-slate-100">
                            <label className="text-sm font-semibold text-slate-900">Dokumen Pendukung Lainnya</label>

                            {(type === 'Perbaikan AC / mobil / motor / asset lain' || type === 'Sewa Gudang') && (
                                <div className="flex items-center gap-2 rounded-md border border-bulir-200 bg-bulir-50 p-3 text-sm text-bulir-800">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span><strong>Wajib Diisi:</strong> Tipe pengajuan ini memerlukan lampiran PDF / Dokumen perbandingan.</span>
                                </div>
                            )}

                            <div className="flex items-center gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Input
                                        type="file"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="file:bg-slate-100 file:text-slate-700 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:font-semibold hover:file:bg-slate-200 cursor-pointer h-11"
                                        accept=".pdf,.doc,.docx,.png,.jpg"
                                    />
                                    <Paperclip className="absolute right-3 top-3 h-5 w-5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">Lampirkan Quotation, Invoice, Foto, atau dokumen PDF lainnya jika diperlukan.</p>
                        </div>

                    </CardContent>
                    <CardFooter className="flex justify-between items-center bg-slate-50/80 mt-2 px-6 py-4 rounded-b-xl border-t border-slate-100">
                        <span className="text-sm text-slate-500">Pastikan seluruh data sudah terisi dengan benar.</span>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                type="button"
                                className="bg-white"
                                disabled={!title.trim()}
                                title={title.trim() ? undefined : 'Isi judul proposal terlebih dahulu'}
                                onClick={() => setIsDraftOpen(true)}
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Pratinjau &amp; Cetak Draft
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || isSubmitted || isExceeding || amount <= 0}
                                className="min-w-[140px]"
                            >
                                {isSubmitting ? 'Mengirim...' : isSubmitted ? (
                                    <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />
                                        Berhasil
                                    </>
                                ) : 'Kirim Proposal'}
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </Card>

            {/* Draft preview. The sheet shown here is the same component the
                printer gets, so nothing can drift between the two. */}
            <Modal
                isOpen={isDraftOpen}
                onClose={() => setIsDraftOpen(false)}
                title="Pratinjau Draft Proposal"
                className="max-w-[calc(210mm+4rem)]"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-500">
                        Draft ini belum bernomor dan belum diajukan. Kolom tanda tangan Branch Head,
                        Sub Dept Head, ADH, dan Region Head sengaja dikosongkan untuk ditandatangani manual.
                    </p>

                    <div className="max-h-[60vh] overflow-auto rounded-lg border border-slate-200 bg-slate-100 p-4">
                        <div className="mx-auto w-fit shadow-sm ring-1 ring-slate-900/10">
                            <ProposalDocument proposal={draftProposal} isDraft />
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                        <Button variant="ghost" type="button" onClick={() => setIsDraftOpen(false)}>
                            Tutup
                        </Button>
                        <Button type="button" onClick={printSheet}>
                            <Printer className="mr-2 h-4 w-4" />
                            Cetak / Simpan PDF
                        </Button>
                    </div>
                </div>
            </Modal>

            {isDraftOpen && (
                <PrintPortal>
                    <ProposalDocument proposal={draftProposal} isDraft />
                </PrintPortal>
            )}
        </div>
    );
}
