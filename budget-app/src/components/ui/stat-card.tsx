import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export type StatAccent = 'astra' | 'padi' | 'bulir' | 'honda' | 'ink';

/**
 * White card, coloured rail. The accent is carried by a hairline at the top
 * and the icon chip only — never by the card's fill. Four saturated tiles in a
 * row compete with the charts below them and leave nowhere for a genuinely
 * urgent state to go.
 */
const ACCENT: Record<StatAccent, { rail: string; chip: string; value: string }> = {
    astra: { rail: 'bg-astra-600', chip: 'bg-astra-50 text-astra-700', value: 'text-slate-900' },
    padi: { rail: 'bg-padi-500', chip: 'bg-padi-50 text-padi-700', value: 'text-slate-900' },
    bulir: { rail: 'bg-bulir-400', chip: 'bg-bulir-50 text-bulir-700', value: 'text-slate-900' },
    honda: { rail: 'bg-honda-600', chip: 'bg-honda-50 text-honda-600', value: 'text-honda-700' },
    ink: { rail: 'bg-astra-900', chip: 'bg-slate-100 text-slate-600', value: 'text-slate-900' },
};

export function StatCard({
    label,
    value,
    hint,
    icon: Icon,
    accent = 'astra',
    children,
    className,
}: {
    label: string;
    value: React.ReactNode;
    hint?: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
    accent?: StatAccent;
    children?: React.ReactNode;
    className?: string;
}) {
    const tone = ACCENT[accent];

    return (
        <Card className={cn('relative overflow-hidden', className)}>
            <span className={cn('absolute inset-x-0 top-0 h-1', tone.rail)} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 pt-5">
                <CardTitle className="text-sm font-medium text-slate-500">{label}</CardTitle>
                <span
                    className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        tone.chip
                    )}
                >
                    <Icon className="h-4 w-4" />
                </span>
            </CardHeader>
            <CardContent>
                <div className={cn('text-2xl font-bold tabular-nums', tone.value)}>{value}</div>
                {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
                {children}
            </CardContent>
        </Card>
    );
}

/**
 * Utilisation reads as a crop: green while there is room to grow, gold as it
 * ripens toward the limit, Honda red once it is over.
 */
export function UtilizationBar({ percent }: { percent: number }) {
    const clamped = Math.max(0, Math.min(100, percent));
    const fill =
        clamped > 90 ? 'bg-honda-600' : clamped > 75 ? 'bg-bulir-400' : 'bg-padi-500';

    return (
        <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={Math.round(clamped)}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className={cn('h-full rounded-full transition-[width] duration-300 ease-out-strong', fill)}
                style={{ width: `${clamped}%` }}
            />
        </div>
    );
}

/** Page title block, with the four-colour signature under it. */
export function PageHeading({
    title,
    description,
    action,
}: {
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h2>
                {description && <p className="mt-1 text-slate-500">{description}</p>}
                <span aria-hidden="true" className="mt-3 flex h-1 w-24 overflow-hidden rounded-full">
                    <span className="h-full flex-[4] bg-astra-600" />
                    <span className="h-full flex-[2] bg-honda-600" />
                    <span className="h-full flex-[3] bg-padi-500" />
                    <span className="h-full flex-[2] bg-bulir-400" />
                </span>
            </div>
            {action && <div className="self-start sm:self-auto">{action}</div>}
        </div>
    );
}
