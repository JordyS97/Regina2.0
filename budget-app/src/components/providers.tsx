'use client';

import { AuthProvider } from '@/context/auth-context';
import { ToastProvider } from '@/components/ui/toast';
import { SessionNotifier } from '@/components/session-notifier';

export function Providers({ children }: { children: React.ReactNode }) {
    // Toasts sit outside auth so a notification can still be raised while the
    // session is resolving; the notifier sits inside it because the greeting
    // needs to know who just walked in.
    return (
        <ToastProvider>
            <AuthProvider>
                <SessionNotifier />
                {children}
            </AuthProvider>
        </ToastProvider>
    );
}
