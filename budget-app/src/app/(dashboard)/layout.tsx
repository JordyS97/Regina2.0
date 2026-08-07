'use client';

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex min-h-screen">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className={cn(
                "flex min-h-screen flex-1 flex-col transition-[margin-left] duration-200 ease-drawer",
                isSidebarOpen ? "ml-64" : "ml-20"
            )}>
                <Header />
                <main className="flex-1 overflow-auto p-6 sm:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
