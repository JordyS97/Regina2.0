'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { PadiMark } from '@/components/brand/padi-mark';
import { APP_NAME } from '@/lib/brand';
import {
    BarChart3,
    FilePlus,
    CheckSquare,
    User as UserIcon,
    Globe,
    Settings,
    Users,
    Menu,
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
            "fixed left-0 top-0 bottom-0 z-50 flex flex-col border-r border-astra-900/60 bg-astra-950 text-astra-100/80",
            "transition-[width] duration-200 ease-drawer",
            isOpen ? "w-64" : "w-20"
        )}>
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
                <div className={cn(
                    "flex items-center gap-2.5 overflow-hidden transition-[opacity,max-width] duration-200 ease-out-strong",
                    isOpen ? "max-w-full opacity-100" : "max-w-0 opacity-0"
                )}>
                    <PadiMark className="h-6 w-6 shrink-0" />
                    <span className="whitespace-nowrap text-lg font-bold tracking-[0.18em] text-white">
                        {APP_NAME}
                    </span>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={isOpen ? 'Ciutkan menu' : 'Lebarkan menu'}
                    className="shrink-0 rounded-lg p-1.5 text-astra-200/70 transition-[transform,color,background-color] duration-150 ease-out-strong hover:bg-white/10 hover:text-white active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-astra-400"
                >
                    {isOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-6">
                <div className={cn(
                    "mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-astra-300/50 transition-opacity duration-200",
                    isOpen ? "opacity-100" : "opacity-0"
                )}>
                    Navigasi
                </div>
                <nav className="space-y-1">
                    {links.map((link) => {
                        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                title={isOpen ? undefined : link.name}
                                className={cn(
                                    "group relative flex items-center rounded-md px-3 py-2.5 text-sm font-medium",
                                    "transition-[background-color,color] duration-150",
                                    isActive
                                        ? "bg-astra-600 text-white"
                                        : "text-astra-100/70 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {/* A sprout of padi green marks where you are. */}
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-padi-400" />
                                )}
                                <link.icon className={cn(
                                    "h-5 w-5 flex-shrink-0",
                                    isActive ? "text-white" : "text-astra-200/60 group-hover:text-white",
                                    isOpen ? "mr-3" : "mx-auto"
                                )} aria-hidden="true" />
                                <span className={cn(
                                    "overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-200 ease-out-strong",
                                    isOpen ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
                                )}>
                                    {link.name}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className={cn(
                "shrink-0 overflow-hidden border-t border-white/10 px-4 py-4 transition-opacity duration-200",
                isOpen ? "opacity-100" : "opacity-0"
            )}>
                <p className="whitespace-nowrap text-[11px] leading-relaxed text-astra-200/40">
                    Astra Motor · Region NTB
                </p>
            </div>
        </aside>
    );
}
