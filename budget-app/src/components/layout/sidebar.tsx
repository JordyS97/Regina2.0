'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import {
    BarChart3,
    FilePlus,
    CheckSquare,
    User as UserIcon,
    Globe,
    Settings,
    Users
} from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();
    const { user } = useAuth();

    if (!user) return null;

    const r = user.role;

    // Determine which links to show based on role
    const showSubmission = r === 'User' || r === 'Supervisor';
    const showApprovals = r !== 'SuperAdmin';
    const showDashboard = r !== 'SuperAdmin';
    const showProfile = r !== 'SuperAdmin';

    // SuperAdmin specialized views
    const showSystemOverview = r === 'SuperAdmin';
    const showUserManagement = r === 'SuperAdmin';
    const showProposalTracking = r === 'SuperAdmin';
    const showSuperAdminDashboard = r === 'SuperAdmin';

    const links = [
        ...(showSubmission ? [{
            name: 'Submission',
            href: '/submission',
            icon: FilePlus
        }] : []),
        ...(showApprovals ? [{
            name: 'Approvals',
            href: '/approvals',
            icon: CheckSquare
        }] : []),
        ...(showDashboard ? [{
            name: 'Dashboard',
            href: '/dashboard',
            icon: BarChart3
        }] : []),
        ...(showProfile ? [{
            name: 'Profile',
            href: '/profile',
            icon: UserIcon
        }] : []),
        ...(showSuperAdminDashboard ? [{
            name: 'Dashboard',
            href: '/superadmin/dashboard',
            icon: BarChart3
        }] : []),
        ...(showSystemOverview ? [{
            name: 'System Overview',
            href: '/superadmin/overview',
            icon: Globe
        }] : []),
        ...(showUserManagement ? [{
            name: 'User Management',
            href: '/superadmin/users',
            icon: Users
        }] : []),
        ...(showProposalTracking ? [{
            name: 'Proposal Tracking',
            href: '/superadmin/tracking',
            icon: Settings
        }] : [])
    ];

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-slate-300 border-r border-slate-800 z-50">
            <div className="flex h-16 items-center px-6 text-white font-bold text-xl border-b border-slate-800 tracking-tight">
                <span className="text-blue-500 mr-2">✦</span> BudgetPro
            </div>
            <div className="py-6 px-3">
                <div className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Navigation
                </div>
                <nav className="space-y-1">
                    {links.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={cn(
                                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white"
                                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                                )}
                            >
                                <link.icon className={cn(
                                    "mr-3 flex-shrink-0 h-5 w-5",
                                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                                )} aria-hidden="true" />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
