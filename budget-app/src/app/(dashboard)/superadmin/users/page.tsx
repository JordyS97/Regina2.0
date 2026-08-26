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
import { Select } from '@/components/ui/select';
import { PageHeading } from '@/components/ui/stat-card';
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
                <Card className="max-w-md border-honda-100 bg-honda-50 text-center">
                    <CardHeader>
                        <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-honda-500" />
                        <CardTitle className="text-honda-700">Akses Ditolak</CardTitle>
                        <CardDescription className="text-honda-700/80">
                            Anda tidak memiliki izin untuk membuka halaman ini. Area ini khusus Super Admin.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <PageHeading
                title={
                    <span className="flex items-center gap-2.5">
                        <UserCog className="h-8 w-8 text-astra-600" />
                        Manajemen Pengguna
                    </span>
                }
                description="Atur peran, kata sandi awal, dan cabang operasional pengguna."
                action={
                    <Button onClick={() => setIsAddModalOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Tambah Pengguna
                    </Button>
                }
            />

            <Card className="border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50 border-b border-slate-200 pb-4">
                    <CardTitle className="text-lg text-slate-900">Direktori Pengguna</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center gap-3 p-10 text-slate-500"><span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-astra-600" />Memuat direktori pengguna…</div>
                    ) : users.length === 0 ? (
                        <div className="p-10 text-center text-slate-500">Belum ada pengguna terdaftar.</div>
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
                                        <tr key={u.id} className="transition-colors duration-150 hover:bg-slate-50/50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-astra-500 to-astra-700 text-xs font-bold text-white">
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-slate-900">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {u.email}
                                            </td>
                                            <td className="px-6 py-4">
                                                <Select
                                                    value={u.role}
                                                    onChange={(e) => handleUpdateUser(u.id, 'role', e.target.value)}
                                                    disabled={updatingId === u.id || u.id === currentUser.id}
                                                    aria-label={`Peran untuk ${u.name}`}
                                                    options={ALL_ROLES.map(role => ({ label: role, value: role }))}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.role === 'User' ? (
                                                    <Select
                                                        value={u.dealer || ''}
                                                        onChange={(e) => handleUpdateUser(u.id, 'dealer', e.target.value)}
                                                        disabled={updatingId === u.id}
                                                        aria-label={`Cabang untuk ${u.name}`}
                                                        options={[
                                                            { label: '— Belum ada cabang —', value: '' },
                                                            ...ALL_DEALERS.map(dealer => ({ label: dealer, value: dealer })),
                                                        ]}
                                                    />
                                                ) : (
                                                    <span className="text-sm italic text-slate-400">Tidak berlaku</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {updatingId === u.id ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-astra-50 px-2.5 py-1 text-xs font-medium text-astra-700">
                                                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-astra-600" />
                                                            Menyimpan
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full border border-padi-200 bg-padi-50 px-2.5 py-1 text-xs font-medium text-padi-800">
                                                            Aktif
                                                        </span>
                                                    )}

                                                    {u.id !== currentUser.id && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-slate-500 hover:bg-bulir-50 hover:text-bulir-700"
                                                            onClick={() => setResetUser(u)}
                                                            title="Reset kata sandi" aria-label="Reset kata sandi"
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
                        <Select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as Role)}
                            options={ALL_ROLES.map(role => ({ label: role, value: role }))}
                        />
                    </div>
                    {newRole === 'User' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Operational Branch</label>
                            <Select
                                value={newDealer}
                                onChange={(e) => setNewDealer(e.target.value as Dealer | '')}
                                options={[
                                    { label: '— Belum ada cabang —', value: '' },
                                    ...ALL_DEALERS.map(dealer => ({ label: dealer, value: dealer })),
                                ]}
                            />
                        </div>
                    )}
                    <div className="rounded-lg border border-astra-100 bg-astra-50 p-3 text-sm text-astra-800">
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
                    <p>Their password will be permanently changed to: <code className="rounded bg-slate-100 px-1 py-0.5 font-semibold text-honda-700">NTBRegina2.0</code></p>
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
