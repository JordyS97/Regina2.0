'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/components/ui/toast';
import { APP_LONG_NAME } from '@/lib/brand';
import type { Role } from '@/lib/types';

/** What each role is greeted with — the first thing they need to know on open. */
const ROLE_GREETING: Record<Role, string> = {
    User: 'Ajukan proposal budget baru lewat menu Submission.',
    Supervisor: 'Cek proposal yang menunggu persetujuan Anda di menu Approvals.',
    SubDeptHead: 'Cek proposal yang menunggu persetujuan Anda di menu Approvals.',
    FinanceHead: 'Cek proposal yang menunggu persetujuan Anda di menu Approvals.',
    RegionHead: 'Cek proposal yang menunggu persetujuan Anda di menu Approvals.',
    SuperAdmin: 'Pantau seluruh proposal dan pagu budget dari menu Super Admin.',
};

/**
 * The notification a user gets simply for opening the web app: it slides in,
 * holds for a few seconds, then fades out on its own.
 *
 * It fires once per browser session — a greeting that reappears on every route
 * change stops being a greeting and becomes noise.
 */
export function SessionNotifier() {
    const { user, loading } = useAuth();
    const { notify } = useToast();
    const greeted = useRef(false);

    useEffect(() => {
        if (loading || !user || greeted.current) return;

        const sessionKey = `padi:greeted:${user.id}`;
        try {
            if (window.sessionStorage.getItem(sessionKey)) {
                greeted.current = true;
                return;
            }
            window.sessionStorage.setItem(sessionKey, '1');
        } catch {
            // Private-mode browsers throw on sessionStorage. The greeting is
            // not worth failing over — fall through and show it anyway.
        }

        greeted.current = true;

        notify({
            title: `Selamat datang, ${user.name.split(' ')[0]}!`,
            description: `${APP_LONG_NAME} — ${ROLE_GREETING[user.role] ?? ''}`,
            variant: 'success',
            duration: 5000,
        });
    }, [user, loading, notify]);

    return null;
}
