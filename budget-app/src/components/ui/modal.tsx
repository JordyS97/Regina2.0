'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className={cn(
                "relative z-50 w-full max-w-lg rounded-xl bg-white shadow-xl isolate",
                className
            )}>
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
                    <Button variant="ghost" size="icon" onClick={onClose} className="-mr-2 text-slate-500 hover:text-slate-700">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="px-6 py-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
