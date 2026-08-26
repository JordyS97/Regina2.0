'use client';

import * as React from 'react';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
    title: string;
    description?: string;
    variant?: ToastVariant;
    /** Milliseconds the toast stays on screen before it fades out. */
    duration?: number;
}

interface ToastRecord extends Required<Omit<ToastOptions, 'description'>> {
    id: string;
    description?: string;
    /** Set once the toast starts its fade-out, so it can finish before unmounting. */
    leaving: boolean;
}

interface ToastContextValue {
    /** Show a notification. Returns its id so it can be dismissed early. */
    notify: (options: ToastOptions) => string;
    dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4000;
/** Has to match `padi-toast-out` in globals.css, or the toast unmounts mid-fade. */
const EXIT_DURATION = 320;

/** Each variant carries the same meaning it does everywhere else in PADI. */
const VARIANT: Record<ToastVariant, { icon: React.ComponentType<{ className?: string }>; rail: string; chip: string; ring: string }> = {
    success: { icon: CheckCircle2, rail: 'bg-padi-500', chip: 'bg-padi-50 text-padi-700', ring: 'ring-padi-100' },
    error: { icon: XCircle, rail: 'bg-honda-600', chip: 'bg-honda-50 text-honda-600', ring: 'ring-honda-100' },
    warning: { icon: AlertTriangle, rail: 'bg-bulir-400', chip: 'bg-bulir-50 text-bulir-700', ring: 'ring-bulir-100' },
    info: { icon: Info, rail: 'bg-astra-600', chip: 'bg-astra-50 text-astra-700', ring: 'ring-astra-100' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
    // Timers are kept in a ref so a re-render never loses track of a pending
    // dismissal — and so unmounting can clear every one of them.
    const timers = React.useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());

    const clearTimers = React.useCallback((id: string) => {
        timers.current.get(id)?.forEach(clearTimeout);
        timers.current.delete(id);
    }, []);

    const remove = React.useCallback((id: string) => {
        clearTimers(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, [clearTimers]);

    const dismiss = React.useCallback((id: string) => {
        clearTimers(id);
        // Mark it leaving first: the fade-out needs a frame on screen before
        // the node goes away, otherwise the toast simply blinks out.
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
        const exitTimer = setTimeout(() => remove(id), EXIT_DURATION);
        timers.current.set(id, [exitTimer]);
    }, [clearTimers, remove]);

    const notify = React.useCallback(({ title, description, variant = 'info', duration = DEFAULT_DURATION }: ToastOptions) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        setToasts((prev) => {
            const next = [...prev, { id, title, description, variant, duration, leaving: false }];
            // More than four stacked notifications stops being information and
            // starts being a wall; the oldest steps aside.
            return next.slice(-4);
        });

        const holdTimer = setTimeout(() => {
            setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
            const exitTimer = setTimeout(() => {
                timers.current.delete(id);
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, EXIT_DURATION);
            timers.current.set(id, [exitTimer]);
        }, duration);

        timers.current.set(id, [holdTimer]);
        return id;
    }, []);

    React.useEffect(() => {
        const pending = timers.current;
        return () => {
            pending.forEach((list) => list.forEach(clearTimeout));
            pending.clear();
        };
    }, []);

    const value = React.useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastViewport toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastRecord[]; onDismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div
            // aria-live so a screen reader announces what everyone else sees.
            role="region"
            aria-live="polite"
            aria-label="Notifikasi"
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-end gap-3 p-4 sm:p-6"
        >
            {toasts.map((toast) => {
                const tone = VARIANT[toast.variant];
                const Icon = tone.icon;

                return (
                    <div
                        key={toast.id}
                        className={cn(
                            'pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ring-1',
                            tone.ring,
                            toast.leaving ? 'padi-toast-out' : 'padi-toast-in'
                        )}
                        style={{ ['--toast-exit' as string]: `${EXIT_DURATION}ms` }}
                    >
                        <span className={cn('absolute inset-y-0 left-0 w-1', tone.rail)} />
                        <div className="flex items-start gap-3 py-3.5 pl-5 pr-3">
                            <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', tone.chip)}>
                                <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
                                {toast.description && (
                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{toast.description}</p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => onDismiss(toast.id)}
                                aria-label="Tutup notifikasi"
                                className="-mr-1 shrink-0 rounded-md p-1 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-astra-500"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        {!toast.leaving && (
                            <div className="h-0.5 w-full bg-slate-100">
                                <div
                                    className={cn('padi-toast-timer h-full', tone.rail)}
                                    style={{ ['--toast-duration' as string]: `${toast.duration}ms` }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function useToast() {
    const context = React.useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
