'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Save, UserCircle } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();

    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // Seed the form once the profile is available.
    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, name: user.name, email: user.email }));
        }
    }, [user?.id, user?.name, user?.email]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setError('');

        if (!formData.name.trim()) {
            setError('Nama tidak boleh kosong.');
            return;
        }

        if (formData.password && formData.password !== formData.confirmPassword) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }

        if (formData.password && formData.password.length < 6) {
            setError('Password minimal 6 karakter.');
            return;
        }

        setIsSaving(true);
        try {
            if (db && formData.name.trim() !== user.name) {
                await updateDoc(doc(db, 'users', user.id), { name: formData.name.trim() });
            }

            if (formData.password && auth?.currentUser) {
                await updatePassword(auth.currentUser, formData.password);
            }

            await refreshUser();
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2000);
        } catch (err: any) {
            // Firebase requires a recent login before a password change.
            setError(
                err?.code === 'auth/requires-recent-login'
                    ? 'Demi keamanan, silakan logout dan login kembali sebelum mengganti password.'
                    : err?.message || 'Gagal menyimpan perubahan.'
            );
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    if (user.role === 'SuperAdmin') {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-slate-500">Super Admins manage their profile via the central identity provider.</div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">My Profile</h2>
                <p className="text-slate-500 mt-1">Manage your account settings and preferences.</p>
            </div>

            <Card>
                <form onSubmit={handleSave}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5 text-blue-600" />
                            Account Details
                        </CardTitle>
                        <CardDescription>
                            Update your personal details below. Note: Your role ({user.role}) and department ({user.department}) are managed by HR.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">Full Name</label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-900">Email Address</label>
                                <Input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    disabled
                                    readOnly
                                    className="bg-slate-100 text-slate-600"
                                />
                                <p className="text-xs text-slate-500">
                                    Email adalah identitas login Anda dan hanya dapat diubah oleh Super Admin.
                                </p>
                            </div>

                            <div className="pt-4 mt-4 border-t border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-900 mb-4">Change Password</h4>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-900">New Password</label>
                                        <Input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-900">Confirm New Password</label>
                                        <Input
                                            type="password"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>
                        {error && (
                            <div className="p-3 rounded-md bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                                {error}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 mt-6 rounded-b-xl">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setFormData({ name: user.name, email: user.email, password: '', confirmPassword: '' });
                                setError('');
                            }}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaved || isSaving}>
                            {isSaving ? 'Menyimpan...' : isSaved ? 'Saved!' : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
