'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { User, Role, Dealer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ShieldAlert, UserCog, UserPlus, KeyRound } from 'lucide-react';

const ALL_ROLES: Role[] = ['User', 'Supervisor', 'SubDeptHead', 'FinanceHead', 'RegionHead', 'SuperAdmin'];
const ALL_DEALERS: Dealer[] = [
    'H531-SO BIMA',
    'H534-SO AMPENAN',
    'H535-SO CAKRANEGARA',
    'H537-SO SRIWIJAYA',
    'H539-SO GERUNG',
    'H532-SO PRAYA',
    'H538-SO KOPANG',
    'H533-SO MASBAGIK',
    'H536-SO SUMBAWA'
];

export default function UserManagementPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [resetUser, setResetUser] = useState<User | null>(null);

    // Add User Form State
    const [newEmail, setNewEmail] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<Role>('User');
    const [newDealer, setNewDealer] = useState<Dealer | ''>('');

    useEffect(() => {
        fetchUsers();
    }, [currentUser]);

    const fetchUsers = async () => {
        if (currentUser?.role !== 'SuperAdmin') return;
        try {
            if (!db) throw new Error("Firestore is not initialized.");
            const querySnapshot = await getDocs(collection(db, 'users'));
            const fetchedUsers: User[] = [];
            querySnapshot.forEach((uDoc) => {
                fetchedUsers.push({ id: uDoc.id, ...uDoc.data() } as User);
            });
            setUsers(fetchedUsers);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateUser = async (userId: string, field: 'role' | 'dealer', value: string) => {
        setUpdatingId(userId);
        try {
            if (!db) throw new Error("Firestore is not initialized.");
            const userRef = doc(db, 'users', userId);

            const updates: any = { [field]: value };
            if (field === 'role' && value !== 'User') {
                updates.dealer = '';
            }

            await updateDoc(userRef, updates);
            setUsers(users.map(u => u.id === userId ? { ...u, ...updates } : u));
        } catch (error) {
            console.error("Error updating user:", error);
            alert("Failed to update user.");
        } finally {
            setUpdatingId(null);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth?.currentUser) return;
        setUpdatingId('adding');

        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newEmail,
                    name: newName,
                    role: newRole,
                    dealer: newRole === 'User' ? newDealer : '',
                    password: 'NTBRegina2.0', // Basic default password requested
                    requesterIdToken: idToken
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert("User created successfully with default password 'NTBRegina2.0'");
            setIsAddModalOpen(false);
            setNewEmail(''); setNewName(''); setNewRole('User'); setNewDealer('');
            fetchUsers();
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setUpdatingId(null);
        }
    };

    const handleResetPassword = async () => {
        if (!resetUser || !auth?.currentUser) return;
        setUpdatingId(resetUser.id);

        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/admin/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: resetUser.id,
                    password: 'NTBRegina2.0',
                    requesterIdToken: idToken
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            alert(`Password for ${resetUser.email} has been reset to 'NTBRegina2.0'`);
            setResetUser(null);
        } catch (err: any) {
            alert("Error: " + err.message);
        } finally {
            setUpdatingId(null);
        }
    };

    if (currentUser?.role !== 'SuperAdmin') {
        return (
            <div className="flex h-[80vh] items-center justify-center p-6">
                <Card className="max-w-md text-center border-red-100 bg-red-50">
                    <CardHeader>
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <CardTitle className="text-red-700">Access Denied</CardTitle>
                        <CardDescription className="text-red-600">
                            You do not have the required permissions to view this page. This area is restricted to Super Admins.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <UserCog className="h-8 w-8 text-blue-600" />
                        User Role Management
                    </h1>
                    <p className="text-slate-500">
                        Assign roles, default passwords, and operational branches to enterprise users.
                    </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="h-4 w-4" />
                    Add Enterprise User
                </Button>
            </div>

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
                    <CardTitle className="text-lg text-slate-800">Enterprise Users Directory</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Loading user directory...</div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No users found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">User</th>
                                        <th className="px-6 py-4 font-semibold">Email</th>
                                        <th className="px-6 py-4 font-semibold w-48">System Role</th>
                                        <th className="px-6 py-4 font-semibold w-64">Dealer Branch</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-slate-900">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleUpdateUser(u.id, 'role', e.target.value)}
                                                    disabled={updatingId === u.id || u.id === currentUser.id}
                                                    className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                                >
                                                    {ALL_ROLES.map(role => (
                                                        <option key={role} value={role}>{role}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.role === 'User' ? (
                                                    <select
                                                        value={u.dealer || ''}
                                                        onChange={(e) => handleUpdateUser(u.id, 'dealer', e.target.value)}
                                                        disabled={updatingId === u.id}
                                                        className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
                                                    >
                                                        <option value="">-- No Branch Assigned --</option>
                                                        {ALL_DEALERS.map(dealer => (
                                                            <option key={dealer} value={dealer}>{dealer}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className="text-sm text-slate-400 italic">Not Applicable</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {updatingId === u.id ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                                            Updating
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                            Active
                                                        </span>
                                                    )}

                                                    {u.id !== currentUser.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                                            onClick={() => setResetUser(u)}
                                                            title="Reset Password"
                                                        >
                                                            <KeyRound className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add User Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Enterprise User"
            >
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                        <Input required value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                        <Input required type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="john@example.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Role</label>
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as Role)}
                            className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            {ALL_ROLES.map(role => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                    {newRole === 'User' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Operational Branch</label>
                            <select
                                value={newDealer}
                                onChange={(e) => setNewDealer(e.target.value as Dealer | '')}
                                className="w-full text-sm border-slate-200 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">-- No Branch Assigned --</option>
                                {ALL_DEALERS.map(dealer => (
                                    <option key={dealer} value={dealer}>{dealer}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="bg-blue-50 text-blue-800 text-sm p-3 rounded border border-blue-100">
                        Default password "<strong>NTBRegina2.0</strong>" will be assigned.
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={updatingId === 'adding'}>
                            {updatingId === 'adding' ? 'Creating...' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal
                isOpen={!!resetUser}
                onClose={() => setResetUser(null)}
                title="Reset User Password"
            >
                <div className="space-y-4 text-sm text-slate-600">
                    <p>Are you sure you want to reset the password for <strong>{resetUser?.email}</strong>?</p>
                    <p>Their password will be permanently changed to: <code className="bg-slate-100 px-1 py-0.5 rounded text-red-600 font-semibold">NTBRegina2.0</code></p>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={() => setResetUser(null)}>Cancel</Button>
                        <Button type="button" variant="destructive" onClick={handleResetPassword} disabled={updatingId === resetUser?.id}>
                            {updatingId === resetUser?.id ? 'Resetting...' : 'Confirm Reset'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
