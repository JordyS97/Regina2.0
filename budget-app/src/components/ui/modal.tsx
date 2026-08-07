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
    // Escape closes, and the page behind stops scrolling while the modal owns
    // the screen. Neither is something a user will praise; both are things
    // they notice immediately when missing.
    React.useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <div
                className="padi-fade fixed inset-0 bg-astra-950/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* A modal is not anchored to a trigger, so it scales from its own
                centre — the one place the default transform-origin is right. */}
            <div
                className={cn(
                    'padi-enter relative z-50 w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/5 isolate',
                    className
                )}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        aria-label="Tutup"
                        className="-mr-2 text-slate-400 hover:text-slate-700"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="px-6 py-6">{children}</div>
            </div>
        </div>
    );
}
