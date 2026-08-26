'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, ArrowRight, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { PadiScene } from '@/components/brand/padi-scene';
import { BrandRibbon, PadiMark } from '@/components/brand/padi-mark';
import { APP_LONG_NAME, APP_NAME } from '@/lib/brand';

/**
 * Firebase speaks in error codes; people do not. Anything unmapped falls back
 * to a message that tells the user what to do next rather than what broke.
 */
function messageFor(code: string): string {
    switch (code) {
        case 'auth/invalid-email':
            return 'Format email tidak valid.';
        case 'auth/user-disabled':
            return 'Akun ini telah dinonaktifkan. Hubungi Super Admin.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Email atau kata sandi salah.';
        case 'auth/too-many-requests':
            return 'Terlalu banyak percobaan gagal. Silakan coba lagi beberapa saat.';
        case 'auth/network-request-failed':
            return 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.';
        default:
            return 'Gagal masuk. Silakan coba lagi atau hubungi Super Admin.';
    }
}

/** The lifecycle a proposal moves through, named after the crop. */
const PHASES = [
    { label: 'Disemai', caption: 'Pengajuan', dot: 'bg-padi-400' },
    { label: 'Ditumbuhkan', caption: 'Review berjenjang', dot: 'bg-bulir-400' },
    { label: 'Dipanen', caption: 'Persetujuan', dot: 'bg-white' },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [capsOn, setCapsOn] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsAuthenticating(true);

        try {
            if (!auth) throw new Error('firebase-uninitialised');
            await signInWithEmailAndPassword(auth, email.trim(), password);
            // On success the auth listener redirects. Leave the button in its
            // pending state so the form never flashes back to "ready" during
            // the hand-off.
        } catch (err) {
            const code =
                err instanceof Error && 'code' in err ? String((err as { code: unknown }).code) : '';
            setError(
                code
                    ? messageFor(code)
                    : 'Layanan autentikasi belum terkonfigurasi. Hubungi Super Admin.'
            );
            setIsAuthenticating(false);
        }
    };

    return (
        <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.2fr_1fr]">
            {/* ── Left: the field ───────────────────────────────────────────
                On mobile this collapses to a band across the top — enough to
                carry the brand without pushing the form below the fold. */}
            <div className="relative isolate h-52 overflow-hidden sm:h-64 lg:h-auto lg:min-h-screen">
                <div className="absolute inset-0">
                    <PadiScene />
                </div>

                <div className="relative flex h-full flex-col justify-between p-6 sm:p-8 lg:p-12 xl:p-16">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/25 backdrop-blur-sm">
                            <PadiMark className="h-6 w-6" />
                        </span>
                        <div className="leading-tight">
                            <div className="text-lg font-bold tracking-[0.18em] text-white">
                                {APP_NAME}
                            </div>
                            <div className="text-[11px] font-medium uppercase tracking-wider text-white/70">
                                Astra Motor
                            </div>
                        </div>
                    </div>

                    <div className="hidden lg:block">
                        <h1 className="max-w-lg text-[2.5rem] font-bold leading-[1.15] tracking-tight text-white xl:text-[2.75rem]">
                            Setiap proposal
                            <br />
                            <span className="text-bulir-200">disemai sampai panen.</span>
                        </h1>
                        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75">
                            {APP_LONG_NAME}. Ajukan, telusuri, dan setujui kebutuhan budget
                            dealer dalam satu alur yang rapi — dari benih ide hingga
                            persetujuan akhir.
                        </p>

                        <div className="mt-10 flex max-w-md items-stretch gap-3">
                            {PHASES.map((phase) => (
                                <div
                                    key={phase.label}
                                    className="flex-1 rounded-lg border border-white/15 bg-white/[0.07] px-3 py-2.5 backdrop-blur-sm"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span className={`h-1.5 w-1.5 rounded-full ${phase.dot}`} />
                                        <span className="text-xs font-semibold text-white">
                                            {phase.label}
                                        </span>
                                    </span>
                                    <span className="mt-0.5 block text-[11px] text-white/60">
                                        {phase.caption}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Right: the form ──────────────────────────────────────── */}
            <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-12 xl:px-16">
                <div className="w-full max-w-sm">
                    <div className="padi-rise" style={{ '--delay': '40ms' } as React.CSSProperties}>
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl font-bold tracking-[0.2em] text-astra-800">
                                {APP_NAME}
                            </span>
                            <span className="text-xs font-medium text-slate-400">
                                v2.0
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{APP_LONG_NAME}</p>
                        <BrandRibbon className="mt-4 max-w-[104px]" />
                    </div>

                    <div
                        className="padi-rise mt-9"
                        style={{ '--delay': '100ms' } as React.CSSProperties}
                    >
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                            Masuk ke akun Anda
                        </h2>
                        <p className="mt-1.5 text-sm text-slate-500">
                            Gunakan email Astra Motor yang terdaftar.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="mt-8 space-y-5">
                        <div
                            className="padi-rise space-y-1.5"
                            style={{ '--delay': '160ms' } as React.CSSProperties}
                        >
                            <label
                                htmlFor="email"
                                className="text-sm font-medium text-slate-700"
                            >
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="nama@astramotor.co.id"
                                    className="h-11 pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div
                            className="padi-rise space-y-1.5"
                            style={{ '--delay': '210ms' } as React.CSSProperties}
                        >
                            <label
                                htmlFor="password"
                                className="text-sm font-medium text-slate-700"
                            >
                                Kata Sandi
                            </label>
                            <div className="relative">
                                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="h-11 pl-10 pr-11"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyUp={(e) =>
                                        setCapsOn(e.getModifierState?.('CapsLock') ?? false)
                                    }
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={
                                        showPassword
                                            ? 'Sembunyikan kata sandi'
                                            : 'Tampilkan kata sandi'
                                    }
                                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-400 transition-colors duration-150 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-astra-500"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {capsOn && (
                                <p className="flex items-center gap-1.5 pt-0.5 text-xs font-medium text-bulir-700">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Caps Lock sedang aktif.
                                </p>
                            )}
                        </div>

                        {error && (
                            <div
                                role="alert"
                                className="flex items-start gap-2.5 rounded-lg border border-honda-200 bg-honda-50 p-3 text-sm font-medium text-honda-700"
                            >
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div
                            className="padi-rise"
                            style={{ '--delay': '260ms' } as React.CSSProperties}
                        >
                            <Button
                                type="submit"
                                className="group h-11 w-full bg-astra-600 text-[15px] font-semibold text-white shadow-sm hover:bg-astra-700"
                                disabled={isAuthenticating}
                            >
                                {isAuthenticating ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                        Memverifikasi…
                                    </>
                                ) : (
                                    <>
                                        Masuk
                                        <ArrowRight className="padi-hover-nudge ml-2 h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>

                    <p
                        className="padi-rise mt-8 border-t border-slate-100 pt-6 text-xs leading-relaxed text-slate-400"
                        style={{ '--delay': '320ms' } as React.CSSProperties}
                    >
                        Akun dibuat oleh Super Admin. Jika Anda belum memiliki akses atau
                        lupa kata sandi, hubungi Super Admin untuk pengaturan ulang.
                    </p>
                </div>
            </div>
        </div>
    );
}
