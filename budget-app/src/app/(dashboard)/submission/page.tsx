'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MOCK_GL_ACCOUNTS } from '@/lib/mock-data';
import { useAuth } from '@/context/auth-context';
import { CheckCircle2, FileText, AlertTriangle, Paperclip } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ProposalType } from '@/lib/types';

export default function SubmissionPage() {
    const { user } = useAuth();
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [title, setTitle] = useState('');
    const [type, setType] = useState('');
    const [glAccount, setGlAccount] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<number | ''>('');
    const [currentBalance, setCurrentBalance] = useState<number | ''>('');
    const [file, setFile] = useState<File | null>(null);

    // Restrict access
    if (!user || (user.role !== 'User' && user.role !== 'Supervisor')) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">You do not have permission to view this page.</div>
            </div>
        );
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (typeof amount !== 'number' || typeof currentBalance !== 'number') return;

        if (amount > currentBalance) {
            alert("Error: Requested amount exceeds the current budget balance you entered.");
            return;
        }

        try {
            setIsSubmitting(true);
            let attachmentUrl = null;

            // 1. Upload File to Storage if exists
            if (file && storage) {
                const fileRef = ref(storage, `proposals/${Date.now()}_${file.name}`);
                const uploadResult = await uploadBytes(fileRef, file);
                attachmentUrl = await getDownloadURL(uploadResult.ref);
            }

            // 2. Write Document to Firestore
            if (db) {
                // Generate a mock 'P...' tracking ID
                const trackingId = `P${new Date().getFullYear()}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

                await addDoc(collection(db, 'proposals'), {
                    trackingId,
                    title,
                    type: type as ProposalType,
                    amount,
                    description,
                    glAccountCode: glAccount,
                    dealer: "H531-SO BIMA", // Mocked default for form, ideally user.dealer
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
                });
            }

            setIsSubmitted(true);
            setTimeout(() => {
                setIsSubmitted(false);
                setAmount('');
                setCurrentBalance('');
                setTitle('');
                setType('');
                setGlAccount('');
                setDescription('');
                setFile(null);
            }, 3000);
        } catch (error) {
            console.error("Error submitting proposal:", error);
            alert("Failed to submit proposal. Make sure Firebase is configured.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isExceeding = typeof amount === 'number' && typeof currentBalance === 'number' && amount > currentBalance;
    const remainingAfter = typeof amount === 'number' && typeof currentBalance === 'number' ? currentBalance - amount : null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Submit Proposal</h2>
                <p className="text-slate-500 mt-1">Create a new budget proposal for approval.</p>
            </div>

            <Card>
                <form onSubmit={handleSubmit}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Proposal Details
                        </CardTitle>
                        <CardDescription>
                            Fill out the required information below. Submissions will be routed to your immediate supervisor.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Proposal Title */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <label className="text-sm font-medium text-slate-900">Proposal Title <span className="text-red-500">*</span></label>
                                <Input required placeholder="e.g. Q4 Marketing Campaign" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>

                            {/* Proposal Type */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">Proposal Type <span className="text-red-500">*</span></label>
                                <Select
                                    required
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                    options={[
                                        { label: 'Select down...', value: '' },
                                        { label: 'Stationary', value: 'Stationary' },
                                        { label: 'Local Event', value: 'Local Event' },
                                        { label: 'Exhibition', value: 'Exhibition' },
                                        { label: 'Asset Repair', value: 'Asset Repair' },
                                        { label: 'Internal Memo', value: 'Internal Memo' },
                                    ]}
                                />
                            </div>

                            {/* G/L Account */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">G/L Account Code <span className="text-red-500">*</span></label>
                                <Select
                                    required
                                    value={glAccount}
                                    onChange={e => setGlAccount(e.target.value)}
                                    options={[
                                        { label: 'Select G/L Account...', value: '' },
                                        ...MOCK_GL_ACCOUNTS.map(gl => ({
                                            label: `${gl.code} - ${gl.name} (Global Available: ${formatCurrency(gl.budgetRemaining)})`,
                                            value: gl.code
                                        }))
                                    ]}
                                />
                            </div>

                            {/* Current Budget Balance Input */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">Your Current Budget Balance (Rp) <span className="text-red-500">*</span></label>
                                <Input
                                    required
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="0"
                                    value={currentBalance}
                                    onChange={(e) => setCurrentBalance(e.target.value ? Number(e.target.value) : '')}
                                />
                            </div>

                            {/* Required Amount */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">Requested Amount (Rp) <span className="text-red-500">*</span></label>
                                <Input
                                    required
                                    type="number"
                                    min="1"
                                    step="1"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                                />
                            </div>

                            {/* Budget Validation Preview */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                {remainingAfter !== null && (
                                    <div className={`p-4 rounded-md border text-sm flex items-center justify-between ${isExceeding ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-700">Projected Remaining Balance:</span>
                                            <span className={`font-mono font-bold ${isExceeding ? 'text-red-600' : 'text-slate-900'}`}>{formatCurrency(remainingAfter)}</span>
                                        </div>
                                        <div>
                                            {isExceeding ? (
                                                <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Exceeds Balance</Badge>
                                            ) : (
                                                <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Can Approve</Badge>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* File Upload Attachment */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <label className="text-sm font-medium text-slate-900">Supporting Document (PDF/XLSX)</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative flex-1">
                                        <Input
                                            type="file"
                                            onChange={handleFileChange}
                                            className="file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-md file:px-4 file:py-1 file:mr-4 file:font-semibold hover:file:bg-blue-100 cursor-pointer h-11"
                                            accept=".pdf,.xlsx,.xls,.doc,.docx,.png,.jpg"
                                        />
                                        <Paperclip className="absolute right-3 top-3 h-5 w-5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500">Attach quotations, vendor proposals, or comparison specs.</p>
                            </div>

                            {/* Description */}
                            <div className="space-y-2 col-span-1 md:col-span-2">
                                <label className="text-sm font-medium text-slate-900">Description / Business Case <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full flex min-h-[120px] rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                                    placeholder="Provide a detailed justification for this budget request..."
                                />
                            </div>

                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 mt-6 rounded-b-xl">
                        <Button variant="outline" type="button">Save Draft</Button>
                        <Button type="submit" disabled={isSubmitting || isSubmitted || isExceeding}>
                            {isSubmitting ? 'Uploading & Submitting...' : isSubmitted ? (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Submitted
                                </>
                            ) : 'Submit Proposal'}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
