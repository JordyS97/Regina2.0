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
    Users,
    Menu,
    X,
    ChevronLeft
} from 'lucide-react';

export function Sidebar({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (val: boolean) => void }) {
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
        <aside className={cn(
            "fixed left-0 top-0 bottom-0 bg-slate-900 text-slate-300 border-r border-slate-800 z-50 transition-all duration-300 ease-in-out flex flex-col",
            isOpen ? "w-64" : "w-20"
        )}>
            <div className="flex h-16 items-center justify-between px-4 text-white font-bold text-xl border-b border-slate-800 tracking-tight shrink-0">
                <div className={cn("flex items-center overflow-hidden transition-all duration-300", isOpen ? "opacity-100 max-w-full" : "opacity-0 max-w-0")}>
                    <span className="text-blue-500 mr-2">✦</span> BudgetPro
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
                >
                    {isOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
            </div>
            <div className="py-6 px-3 flex-1 overflow-y-auto overflow-x-hidden">
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
                                    "flex-shrink-0 h-5 w-5",
                                    isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200",
                                    isOpen ? "mr-3" : "mx-auto"
                                )} aria-hidden="true" />
                                <span className={cn(
                                    "transition-all duration-300 whitespace-nowrap overflow-hidden",
                                    isOpen ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
                                )}>
                                    {link.name}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
