'use client';

import { useAuth } from '@/context/auth-context';
import { LogOut } from 'lucide-react';
import { APP_LONG_NAME, APP_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';

/** Roles are tinted by where they sit in the chain, not arbitrarily. */
const ROLE_TONE: Record<Role, string> = {
    User: 'bg-padi-50 text-padi-800 ring-padi-200',
    Supervisor: 'bg-padi-100 text-padi-900 ring-padi-300',
    SubDeptHead: 'bg-bulir-50 text-bulir-800 ring-bulir-200',
    FinanceHead: 'bg-astra-50 text-astra-800 ring-astra-200',
    RegionHead: 'bg-astra-100 text-astra-900 ring-astra-300',
    SuperAdmin: 'bg-honda-50 text-honda-700 ring-honda-200',
};

export function Header() {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
            <div className="flex h-16 items-center justify-between px-6 sm:px-8">
                <div className="flex items-baseline gap-3">
                    <h1 className="text-lg font-bold tracking-[0.18em] text-astra-800">
                        {APP_NAME}
                    </h1>
                    <span className="hidden text-xs font-medium text-slate-400 sm:inline">
                        {APP_LONG_NAME}
                    </span>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                    <span
                        className={cn(
                            'rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                            ROLE_TONE[user.role]
                        )}
                    >
                        {user.role}
                    </span>

                    <div className="hidden h-8 w-px bg-slate-200 sm:block" />

                    <div className="flex items-center gap-3">
                        <div className="hidden flex-col text-right sm:flex">
                            <span className="text-sm font-semibold leading-tight text-slate-900">
                                {user.name}
                            </span>
                            <span className="text-xs text-slate-500">
                                {user.department} Dept
                            </span>
                        </div>
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-astra-500 to-astra-700 text-sm font-bold text-white shadow-sm">
                            {user.name.charAt(0).toUpperCase()}
                        </div>

                        <button
                            onClick={logout}
                            className="ml-1 rounded-full p-2 text-slate-400 transition-[transform,color,background-color] duration-150 ease-out-strong hover:bg-honda-50 hover:text-honda-600 active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-astra-500"
                            title="Keluar"
                            aria-label="Keluar"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
