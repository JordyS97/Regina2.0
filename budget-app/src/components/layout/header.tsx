'use client';

import { useAuth } from '@/context/auth-context';
import { LogOut } from 'lucide-react';

export function Header() {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-40 sticky top-0 shadow-sm">
            <div className="flex items-center">
                <h1 className="text-xl font-semibold text-slate-800">
                    REGINA 2.0
                </h1>
            </div>

            <div className="flex items-center space-x-6">
                <div className="text-sm">
                    <span className="text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-full">
                        {user.role}
                    </span>
                </div>

                <div className="h-8 w-px bg-slate-200" />

                <div className="flex items-center gap-3">
                    <div className="flex flex-col text-right">
                        <span className="text-sm font-semibold text-slate-800 leading-tight">{user.name}</span>
                        <span className="text-xs text-slate-500">{user.department} Dept</span>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                        {user.name.charAt(0).toUpperCase()}
                    </div>

                    <button
                        onClick={logout}
                        className="ml-2 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        title="Logout"
                    >
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </header>
    );
}
