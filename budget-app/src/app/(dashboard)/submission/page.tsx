'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MOCK_GL_ACCOUNTS } from '@/lib/mock-data';
import { useAuth } from '@/context/auth-context';
import { CheckCircle2, FileText, AlertTriangle, Paperclip, Plus, Trash2, UploadCloud } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ProposalType, ItemizedCost } from '@/lib/types';
import * as XLSX from 'xlsx';

type BudgetSource = 'GL Account' | 'Added Fee (Biaya Titipan C6)' | 'Retail JoinProm';

export default function SubmissionPage() {
    const { user } = useAuth();
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

    // Access restriction
    if (!user || (user.role !== 'User' && user.role !== 'Supervisor')) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">You do not have permission to view this page.</div>
            </div>
        );
    }

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
        if (budgetSource !== 'GL Account' && budgetSource !== 'Added Fee (Biaya Titipan C6)') {
            setCurrentBalance('');
        }
    }, [budgetSource]);

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
                    setExcelError('Could not find a "JUMLAH" column in the uploaded file.');
                    setCurrentBalance('');
                } else {
                    setCurrentBalance(sum);
                }
            } catch (err) {
                console.error("Error parsing Excel:", err);
                setExcelError('Failed to parse the file. Please ensure it is a valid Excel/CSV.');
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
            alert("This proposal type requires a supporting Document/PDF to be attached.");
            return;
        }

        if (budgetSource === 'GL Account' && !glAccount) {
            alert("Please select a G/L Account.");
            return;
        }

        if (amount <= 0) {
            alert("Requested amount must be greater than 0.");
            return;
        }

        if ((budgetSource === 'GL Account' || budgetSource === 'Added Fee (Biaya Titipan C6)') && typeof currentBalance === 'number' && amount > currentBalance) {
            alert("Error: Requested amount exceeds the available budget balance.");
            return;
        }

        try {
            setIsSubmitting(true);
            let attachmentUrl = null;

            // Upload main supporting file
            if (file && storage) {
                const fileRef = ref(storage, `proposals/${Date.now()}_${file.name}`);
                const uploadResult = await uploadBytes(fileRef, file);
                attachmentUrl = await getDownloadURL(uploadResult.ref);
            }

            // (Optional) Could also upload the excelFile if needed, omitting for now unless required

            if (db) {
                const trackingId = `P${new Date().getFullYear()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

                // Assemble the generic payload safely mapped to the updated type
                const payload = {
                    trackingId,
                    title,
                    subtitle,
                    background,
                    type,
                    amount,
                    budgetSource,
                    glAccountCode: budgetSource === 'GL Account' ? glAccount : '',
                    items: budgetSource === 'GL Account' ? items : [],
                    dealer: "H531-SO BIMA", // Mocked default
                    status: 'Pending Supervisor',
                    submittedBy: {
                        id: user.id || 'unknown',
                        name: user.name,
                        department: user.department
                    },
                    history: [
                        {
                            status: 'Pending Supervisor',
                            date: new Date().toISOString(),
                            actor: { id: user.id || 'unknown', name: user.name, role: user.role }
                        }
                    ],
                    attachmentUrl,
                    createdAt: serverTimestamp()
                };

                await addDoc(collection(db, 'proposals'), payload);
            }

            setIsSubmitted(true);
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
            alert("Failed to submit proposal. Make sure Firebase is configured.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isExceeding = (budgetSource === 'GL Account' || budgetSource === 'Added Fee (Biaya Titipan C6)') && typeof currentBalance === 'number' && amount > currentBalance;
    const remainingAfter = (budgetSource === 'GL Account' || budgetSource === 'Added Fee (Biaya Titipan C6)') && typeof currentBalance === 'number' ? currentBalance - amount : null;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Form Pengajuan Proposal</h2>
                <p className="text-slate-500 mt-1">Isi formulir pengajuan budget lengkap dengan rincian biaya.</p>
            </div>

            <Card className="shadow-sm border-slate-200">
                <form onSubmit={handleSubmit}>
                    <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-6 rounded-t-xl">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <FileText className="h-5 w-5 text-blue-600" />
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
                                <label className="text-sm font-semibold text-slate-900">Judul Proposal (Title) <span className="text-red-500">*</span></label>
                                <Input required placeholder="Contoh: Proposal Showroom Event Q3" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-900">Perihal (Subtitle) <span className="text-red-500">*</span></label>
                                <Input required placeholder="Masukkan perihal proposal..." value={subtitle} onChange={e => setSubtitle(e.target.value)} />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-slate-900">Latar Belakang (Background) <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    value={background}
                                    onChange={e => setBackground(e.target.value)}
                                    className="w-full flex min-h-[80px] rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 italic text-slate-700"
                                    placeholder="(MENJELASKAN MAKSUD DAN TUJUAN DARI PENGAJUAN PROPOSAL)"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-900">Tipe Proposal <span className="text-red-500">*</span></label>
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
                                <label className="text-sm font-semibold text-slate-900">Sumber Budget <span className="text-red-500">*</span></label>
                                <Select
                                    required
                                    value={budgetSource}
                                    onChange={e => setBudgetSource(e.target.value as BudgetSource)}
                                    options={[
                                        { label: 'GL Account', value: 'GL Account' },
                                        { label: 'Added Fee (Biaya Titipan C6)', value: 'Added Fee (Biaya Titipan C6)' },
                                        { label: 'Retail JoinProm', value: 'Retail JoinProm' },
                                    ]}
                                />
                            </div>
                        </div>

                        {/* Section 2: Budget Source Dynamic Engine */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6 space-y-6">

                            {/* --- SCENARIO A: GL ACCOUNT --- */}
                            {budgetSource === 'GL Account' && (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-900">Pilih G/L Account Code <span className="text-red-500">*</span></label>
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
                                            <label className="text-sm font-medium text-slate-900">Saldo Budget Saat Ini (Rp) <span className="text-red-500">*</span></label>
                                            <Input
                                                required
                                                type="number"
                                                min="0"
                                                step="1"
                                                placeholder="Contoh: 15000000"
                                                value={currentBalance}
                                                onChange={(e) => setCurrentBalance(e.target.value ? Number(e.target.value) : '')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* --- SCENARIO B: ADDED FEE --- */}
                            {budgetSource === 'Added Fee (Biaya Titipan C6)' && (
                                <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200 bg-white p-6 rounded-xl border-2 border-dashed border-blue-200">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
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
                                                className="file:bg-blue-600 file:text-white file:border-0 file:rounded file:px-4 file:py-1 file:mr-4 file:font-semibold hover:file:bg-blue-700 cursor-pointer text-slate-600"
                                            />
                                            {excelError && (
                                                <p className="text-sm font-medium text-red-500 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {excelError}</p>
                                            )}
                                        </div>
                                    </div>
                                    {typeof currentBalance === 'number' && (
                                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-blue-200 rounded-lg">
                                            <span className="text-sm font-semibold text-slate-700 text-right w-full pr-4">Total Budget Available dari Excel:</span>
                                            <span className="font-mono text-xl font-bold text-slate-900 shrink-0">{formatCurrency(currentBalance)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- SCENARIO C: RETAIL JOINPROM --- */}
                            {budgetSource === 'Retail JoinProm' && (
                                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200 bg-blue-50 p-5 rounded-xl border border-blue-200 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                                    <div>
                                        <h3 className="text-sm font-bold text-blue-900">Retail JoinProm Terpilih</h3>
                                        <p className="text-xs text-blue-700 mt-0.5">Silakan tambahkan item kebutuhan pada tabel Rincian Biaya Pengajuan di bawah ini.</p>
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
                                                                className="w-full h-10 px-3 outline-none bg-transparent focus:bg-blue-50/50"
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
                                                                className="w-full h-10 px-3 text-center outline-none bg-transparent focus:bg-blue-50/50"
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
                                                                className="w-full h-10 pl-8 pr-3 text-right outline-none bg-transparent focus:bg-blue-50/50"
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
                                                                className="w-full h-10 px-3 text-center outline-none bg-transparent focus:bg-blue-50/50"
                                                                value={item.m1}
                                                                onChange={(e) => handleItemChange(idx, 'm1', e.target.value)}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-2 text-center">
                                                            {items.length > 1 && (
                                                                <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Table Footer Totals */}
                                                <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                                                    <td colSpan={4} className="px-4 py-3 text-right uppercase tracking-wider">TOTAL PERMINTAAN DANA</td>
                                                    <td className="px-4 py-3 text-right border-x border-slate-300 text-blue-700">{formatCurrency(amount).replace('Rp', '')}</td>
                                                    <td colSpan={2}></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-white p-2 border-t border-slate-200 flex justify-center">
                                        <Button type="button" variant="ghost" size="sm" onClick={addItem} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-full rounded-md border border-dashed border-blue-200">
                                            <Plus className="w-4 h-4 mr-2" /> Tambah Baris
                                        </Button>
                                    </div>
                                </div>

                                {/* Preview Check for Budget Balances */}
                                {remainingAfter !== null && (
                                    <div className={`p-4 rounded-xl border flex items-center justify-between animate-in fade-in duration-300 ${isExceeding ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-slate-700">Estimasi Sisa Saldo:</span>
                                            <span className={`font-mono text-lg font-bold ${isExceeding ? 'text-red-600' : 'text-emerald-700'}`}>{formatCurrency(remainingAfter)}</span>
                                        </div>
                                        <div>
                                            {isExceeding ? (
                                                <Badge variant="destructive" className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 border-red-200"><AlertTriangle className="w-4 h-4" /> Dana Tidak Mencukupi</Badge>
                                            ) : (
                                                <Badge variant="success" className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="w-4 h-4" /> Saldo Aman</Badge>
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
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 text-sm flex gap-2 items-center">
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
                            <Button variant="outline" type="button" className="bg-white">Cetak Draft</Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting || isSubmitted || isExceeding || amount <= 0}
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
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
        </div>
    );
}
