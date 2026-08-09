'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The PADI mark: a single panicle of rice, heavy enough at the top that it
 * bows. The grains ripen from kuning-hijau at the base to gold at the tip,
 * which is the whole product in one glyph — a proposal that starts green and
 * is carried through to harvest.
 */
export function PadiMark({
    className,
    ...props
}: React.SVGProps<SVGSVGElement>) {
    const id = React.useId();
    const grainGradient = `${id}-grain`;
    const leafGradient = `${id}-leaf`;

    // Grains hang in pairs off the stem. They shrink and crowd toward the tip,
    // the way a real panicle tapers.
    const grains = [0, 1, 2, 3, 4, 5].map((i) => {
        const t = i / 5;
        return {
            y: 19.4 - t * 12.6,
            x: 15.4 + t * 2.2,
            spread: 3.5 - t * 1.5,
            rx: 1.5 - t * 0.45,
            ry: 2.9 - t * 0.95,
            tilt: 30 - t * 8,
        };
    });

    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className={cn('h-6 w-6', className)}
            {...props}
        >
            <defs>
                <linearGradient id={grainGradient} x1="0" y1="1" x2="0.4" y2="0">
                    <stop offset="0%" stopColor="#99b91f" />
                    <stop offset="55%" stopColor="#cbe25f" />
                    <stop offset="100%" stopColor="#fbba24" />
                </linearGradient>
                <linearGradient id={leafGradient} x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#5c7213" />
                    <stop offset="100%" stopColor="#b5d334" />
                </linearGradient>
            </defs>

            {/* Two blades, sweeping out and drooping back down. */}
            <path
                d="M15.2 24.6C11.6 24.2 8.8 22.4 7.4 19.4C11.2 19.2 14 20.8 15.2 24.6Z"
                fill={`url(#${leafGradient})`}
            />
            <path
                d="M16.4 20.2C18.4 17.2 21.4 15.6 24.8 16C23 19.2 20 20.8 16.4 20.2Z"
                fill={`url(#${leafGradient})`}
                opacity="0.85"
            />

            {/* The stem, bowing under the weight it carries. */}
            <path
                d="M15 29.5C14.6 23 15.2 16.4 17.4 10.2C18.2 8 19.4 6 21 4.4"
                stroke="#5c7213"
                strokeWidth="1.7"
                strokeLinecap="round"
            />

            {grains.map((g, i) => (
                <React.Fragment key={i}>
                    <ellipse
                        cx={g.x - g.spread}
                        cy={g.y}
                        rx={g.rx}
                        ry={g.ry}
                        fill={`url(#${grainGradient})`}
                        transform={`rotate(${-g.tilt} ${g.x - g.spread} ${g.y})`}
                    />
                    <ellipse
                        cx={g.x + g.spread}
                        cy={g.y - 1.1}
                        rx={g.rx}
                        ry={g.ry}
                        fill={`url(#${grainGradient})`}
                        transform={`rotate(${g.tilt} ${g.x + g.spread} ${g.y - 1.1})`}
                    />
                </React.Fragment>
            ))}
        </svg>
    );
}

/**
 * The mark on its blue tile — the lockup used wherever PADI needs to sit
 * against a light surface and hold its own.
 */
export function PadiBadge({ className }: { className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center justify-center rounded-xl bg-astra-600 shadow-sm ring-1 ring-astra-800/20',
                'h-10 w-10',
                className
            )}
        >
            <PadiMark className="h-6 w-6" />
        </span>
    );
}

/**
 * The four-colour rule: putih, Astra blue, Honda red, padi green. Used as a
 * hairline under page headers so every screen carries the same signature
 * without shouting.
 */
export function BrandRibbon({ className }: { className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn('flex h-1 w-full overflow-hidden rounded-full', className)}
        >
            <span className="h-full flex-[4] bg-astra-600" />
            <span className="h-full flex-[2] bg-honda-600" />
            <span className="h-full flex-[3] bg-padi-500" />
            <span className="h-full flex-[2] bg-bulir-400" />
        </span>
    );
}
