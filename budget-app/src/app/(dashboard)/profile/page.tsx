'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/auth-context';
import { Save, UserCircle } from 'lucide-react';

export default function ProfilePage() {
    const { user } = useAuth();

    if (!user) return null;
    const [isSaved, setIsSaved] = useState(false);

    // Initialize with mock user data
    const [formData, setFormData] = useState({
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

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
                                    onChange={handleChange}
                                    placeholder="john@company.com"
                                />
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
                    </CardContent>
                    <CardFooter className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 mt-6 rounded-b-xl">
                        <Button type="button" variant="outline">Cancel</Button>
                        <Button type="submit" disabled={isSaved}>
                            {isSaved ? 'Saved!' : (
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
