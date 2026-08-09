'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/* ============================================================================
   Dawn over the paddy.

   Everything below is drawn, not photographed: an SVG scene of terraced sawah
   at first light with rice stalks rim-lit in the foreground. It reads as the
   product's founding metaphor — padi yang disemai — and it costs one HTTP
   request of nothing, because there is no image to fetch.

   Two rules hold the whole file together:
     1. Depth comes from haze, not from size alone. Distant things are lighter,
        lower-contrast, and cooler; near things go almost to silhouette.
     2. Nothing here uses Math.random. The scene is generated from a seeded
        hash so the server and the client draw the identical stalk, and React
        never has to reconcile a mismatch.
   ========================================================================= */

type Pt = { x: number; y: number };

/** Deterministic [0,1) noise. Same input, same output, on any machine. */
function rand(seed: number): number {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}

/** Sample a cubic Bézier at t. */
function cubic(t: number, p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt {
    const mt = 1 - t;
    const a = mt * mt * mt;
    const b = 3 * mt * mt * t;
    const c = 3 * mt * t * t;
    const d = t * t * t;
    return {
        x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
        y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
    };
}

/** Direction of travel at t, in degrees. Grains splay off this angle. */
function cubicAngle(t: number, p0: Pt, p1: Pt, p2: Pt, p3: Pt): number {
    const mt = 1 - t;
    const dx =
        3 * mt * mt * (p1.x - p0.x) +
        6 * mt * t * (p2.x - p1.x) +
        3 * t * t * (p3.x - p2.x);
    const dy =
        3 * mt * mt * (p1.y - p0.y) +
        6 * mt * t * (p2.y - p1.y) +
        3 * t * t * (p3.y - p2.y);
    return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** A terraced band of sawah, curving across the frame. */
function terrace(yTop: number, yBottom: number, amp: number, shift: number) {
    return [
        `M -60 ${(yTop + amp * 0.4).toFixed(1)}`,
        `C 90 ${(yTop - amp + shift).toFixed(1)} 250 ${(yTop + amp).toFixed(1)} 400 ${(yTop - amp * 0.3).toFixed(1)}`,
        `C 540 ${(yTop - amp * 1.3).toFixed(1)} 660 ${(yTop + amp * 0.6).toFixed(1)} 780 ${(yTop - amp * 0.2).toFixed(1)}`,
        `L 780 ${yBottom}`,
        `L -60 ${yBottom}`,
        'Z',
    ].join(' ');
}

/** The lit crest of a terrace bund, where the low sun catches the ridge. */
function terraceCrest(yTop: number, amp: number, shift: number) {
    return [
        `M -60 ${(yTop + amp * 0.4).toFixed(1)}`,
        `C 90 ${(yTop - amp + shift).toFixed(1)} 250 ${(yTop + amp).toFixed(1)} 400 ${(yTop - amp * 0.3).toFixed(1)}`,
        `C 540 ${(yTop - amp * 1.3).toFixed(1)} 660 ${(yTop + amp * 0.6).toFixed(1)} 780 ${(yTop - amp * 0.2).toFixed(1)}`,
    ].join(' ');
}

/**
 * A single blade of rice leaf: out, up, and drooping back down to a point.
 * The two curves run close together on purpose — a rice leaf is a narrow
 * ribbon, and widening this even slightly turns the plant into a banana.
 */
function blade(origin: Pt, dir: number, len: number) {
    const tip: Pt = { x: origin.x + dir * len, y: origin.y + len * 0.3 };
    return [
        `M ${origin.x.toFixed(1)} ${origin.y.toFixed(1)}`,
        `C ${(origin.x + dir * len * 0.38).toFixed(1)} ${(origin.y - len * 0.34).toFixed(1)}`,
        `${(origin.x + dir * len * 0.82).toFixed(1)} ${(origin.y - len * 0.08).toFixed(1)}`,
        `${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`,
        `C ${(origin.x + dir * len * 0.7).toFixed(1)} ${(origin.y - len * 0.02).toFixed(1)}`,
        `${(origin.x + dir * len * 0.32).toFixed(1)} ${(origin.y - len * 0.17).toFixed(1)}`,
        `${origin.x.toFixed(1)} ${origin.y.toFixed(1)}`,
        'Z',
    ].join(' ');
}

type StalkTone = {
    stem: string;
    leaf: string;
    grain: string;
    grainLit: string;
    opacity: number;
};

type StalkProps = {
    seed: number;
    x: number;
    baseY: number;
    height: number;
    scale: number;
    tone: StalkTone;
    grainCount: number;
};

function RiceStalk({
    seed,
    x,
    baseY,
    height,
    scale,
    tone,
    grainCount,
}: StalkProps) {
    const lean = (rand(seed) - 0.5) * height * 0.26;
    const bend = (rand(seed + 9) - 0.5) * height * 0.3 + (lean > 0 ? 18 : -18);

    const tip: Pt = { x: lean, y: -height };
    const s1: Pt = { x: lean * 0.06, y: -height * 0.42 };
    const s2: Pt = { x: lean * 0.5, y: -height * 0.79 };

    // The panicle: it leaves the stem, arcs forward, then falls under the
    // weight of its own grain. That droop is the entire silhouette of a ripe
    // rice plant — without it this reads as wheat. It also has to be a real
    // fraction of the plant's height; a short panicle reads as a weed.
    const pl = height * 0.46;
    const p0 = tip;
    const p1: Pt = { x: tip.x + bend * 0.5, y: tip.y - pl * 0.4 };
    const p2: Pt = { x: tip.x + bend * 1.25, y: tip.y - pl * 0.26 };
    const p3: Pt = { x: tip.x + bend * 1.55, y: tip.y + pl * 0.58 };

    const stemPath = `M 0 0 C ${s1.x.toFixed(1)} ${s1.y.toFixed(1)} ${s2.x.toFixed(1)} ${s2.y.toFixed(1)} ${tip.x.toFixed(1)} ${tip.y.toFixed(1)}`;
    const spinePath = `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`;

    const leafA = cubic(0.26, { x: 0, y: 0 }, s1, s2, tip);
    const leafB = cubic(0.54, { x: 0, y: 0 }, s1, s2, tip);
    const leafC = cubic(0.72, { x: 0, y: 0 }, s1, s2, tip);

    const grains: React.ReactElement[] = [];
    for (let i = 0; i <= grainCount; i++) {
        const t = i / grainCount;
        const at = cubic(t, p0, p1, p2, p3);
        const angle = cubicAngle(t, p0, p1, p2, p3);
        // Plump through the body of the panicle, thinning toward the tip.
        const taper = (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, t * 1.2))) * scale;

        for (const side of [-1, 1] as const) {
            const splay = angle + side * (36 + rand(seed + i * 3 + side) * 16);
            const rad = (splay * Math.PI) / 180;
            const off = 5.4 * scale;
            const cx = at.x + Math.cos(rad) * off;
            const cy = at.y + Math.sin(rad) * off;
            // Grains on the sunward side catch the light; the rest stay dark.
            const lit = rand(seed + i * 7 + side * 2) > 0.55;
            grains.push(
                <ellipse
                    key={`${i}-${side}`}
                    cx={cx.toFixed(1)}
                    cy={cy.toFixed(1)}
                    rx={(2.3 * taper).toFixed(2)}
                    ry={(5.2 * taper).toFixed(2)}
                    fill={lit ? tone.grainLit : tone.grain}
                    transform={`rotate(${(splay + 90).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})`}
                />
            );
        }
    }

    // Taller stalks sway a touch less — they are stiffer and further from the
    // eye, and matched amplitude across depths would flatten the parallax.
    const sway = (1.9 - scale * 0.5).toFixed(2);
    const dur = (6.5 + rand(seed + 21) * 4.5).toFixed(2);
    const delay = (rand(seed + 33) * -9).toFixed(2);

    return (
        <g transform={`translate(${x} ${baseY})`} opacity={tone.opacity}>
            <g
                className="padi-stalk"
                style={
                    {
                        '--sway': `${sway}deg`,
                        '--dur': `${dur}s`,
                        '--delay': `${delay}s`,
                    } as React.CSSProperties
                }
            >
                <path d={blade(leafA, rand(seed + 4) > 0.5 ? 1 : -1, height * 0.24)} fill={tone.leaf} />
                <path d={blade(leafB, rand(seed + 5) > 0.5 ? -1 : 1, height * 0.19)} fill={tone.leaf} />
                <path d={blade(leafC, rand(seed + 6) > 0.5 ? 1 : -1, height * 0.13)} fill={tone.leaf} />
                <path
                    d={stemPath}
                    stroke={tone.stem}
                    strokeWidth={(2.8 * scale).toFixed(2)}
                    strokeLinecap="round"
                    fill="none"
                />
                <path
                    d={spinePath}
                    stroke={tone.stem}
                    strokeWidth={(1.7 * scale).toFixed(2)}
                    strokeLinecap="round"
                    fill="none"
                />
                {grains}
            </g>
        </g>
    );
}

/* ── Depth bands ────────────────────────────────────────────────────────── */

const HAZE: StalkTone = {
    stem: '#7d9758',
    leaf: '#8aa464',
    grain: '#b3bd85',
    grainLit: '#ddc994',
    opacity: 0.4,
};

const MID: StalkTone = {
    stem: '#4a6120',
    leaf: '#4d6522',
    grain: '#8a7d3a',
    grainLit: '#e6b45c',
    opacity: 0.88,
};

// Near-silhouette, but never pure black: a rim of gold on the sunward grains
// is what separates a stalk from a smudge.
const NEAR: StalkTone = {
    stem: '#101a07',
    leaf: '#121d06',
    grain: '#1b2809',
    grainLit: '#c99a3e',
    opacity: 1,
};

const BANDS = [
    { tone: HAZE, baseY: 838, count: 16, minH: 96, varH: 54, scale: 0.4, grains: 9, spread: 58 },
    { tone: MID, baseY: 928, count: 13, minH: 150, varH: 88, scale: 0.66, grains: 12, spread: 74 },
    { tone: NEAR, baseY: 1046, count: 10, minH: 230, varH: 108, scale: 1, grains: 15, spread: 104 },
];

export function PadiScene({ className }: { className?: string }) {
    const id = React.useId();
    const g = (name: string) => `${id}-${name}`;

    // Bands stay separate so the darkening scrim can be painted between the
    // mid and near rows. Flattening them into one list is what washed the
    // foreground out: a scrim drawn over every stalk leaves no silhouette.
    const bandGroups = BANDS.map((band, b) => {
        const items: React.ReactElement[] = [];
        for (let i = 0; i < band.count; i++) {
            const seed = b * 97 + i * 13 + 7;
            const jitter = (rand(seed + 101) - 0.5) * band.spread * 0.9;
            items.push(
                <RiceStalk
                    key={i}
                    seed={seed * 13}
                    x={-40 + (i + 0.5) * (800 / band.count) + jitter}
                    baseY={band.baseY + (rand(seed + 55) - 0.5) * 46}
                    height={band.minH + rand(seed + 77) * band.varH}
                    scale={band.scale}
                    tone={band.tone}
                    grainCount={band.grains}
                />
            );
        }
        return items;
    });

    const motes = Array.from({ length: 16 }, (_, i) => {
        const s = i * 4 + 3;
        return (
            <circle
                key={i}
                cx={40 + rand(s) * 660}
                cy={620 + rand(s + 1) * 420}
                r={(0.9 + rand(s + 2) * 2.1).toFixed(2)}
                fill="#ffe6ae"
                className="padi-mote"
                style={
                    {
                        '--dur': `${(13 + rand(s + 3) * 11).toFixed(1)}s`,
                        '--delay': `${(rand(s + 4) * -20).toFixed(1)}s`,
                        '--drift-x': `${(rand(s + 5) * 60 - 22).toFixed(0)}px`,
                        '--drift-y': `${(-150 - rand(s + 6) * 190).toFixed(0)}px`,
                        '--mote-opacity': (0.28 + rand(s + 7) * 0.45).toFixed(2),
                        opacity: 0,
                    } as React.CSSProperties
                }
            />
        );
    });

    return (
        <svg
            viewBox="0 0 720 1080"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            className={cn('h-full w-full', className)}
        >
            <defs>
                <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#03091a" />
                    <stop offset="24%" stopColor="#061f3e" />
                    <stop offset="46%" stopColor="#0a3866" />
                    <stop offset="70%" stopColor="#155c8c" />
                    <stop offset="100%" stopColor="#4a8fae" />
                </linearGradient>

                {/* The warm horizon is painted as light, not mixed into the sky
                    gradient — mixing blue into gold across a linear ramp is what
                    makes illustrated skies look muddy. */}
                <radialGradient id={g('glow')} cx="0.65" cy="0.55" r="0.75">
                    <stop offset="0%" stopColor="#ffe29e" stopOpacity="0.95" />
                    <stop offset="28%" stopColor="#fbba24" stopOpacity="0.5" />
                    <stop offset="60%" stopColor="#d97406" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#d97406" stopOpacity="0" />
                </radialGradient>

                <radialGradient id={g('sun')}>
                    <stop offset="0%" stopColor="#fffaf0" />
                    <stop offset="52%" stopColor="#ffe6ab" />
                    <stop offset="100%" stopColor="#fbba24" />
                </radialGradient>

                <radialGradient id={g('bloom')}>
                    <stop offset="0%" stopColor="#ffeec4" stopOpacity="0.8" />
                    <stop offset="42%" stopColor="#fbba24" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#fbba24" stopOpacity="0" />
                </radialGradient>

                <linearGradient id={g('ridgeFar')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1b4b73" />
                    <stop offset="100%" stopColor="#3a7a9c" />
                </linearGradient>

                <linearGradient id={g('ridgeMid')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0a2743" />
                    <stop offset="100%" stopColor="#14496d" />
                </linearGradient>

                <linearGradient id={g('haze')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffd894" stopOpacity="0" />
                    <stop offset="55%" stopColor="#ffd894" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ffd894" stopOpacity="0.05" />
                </linearGradient>

                <linearGradient id={g('water')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f4d69c" />
                    <stop offset="38%" stopColor="#c9995a" />
                    <stop offset="100%" stopColor="#456b80" />
                </linearGradient>

                <linearGradient id={g('field')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8ba033" />
                    <stop offset="55%" stopColor="#5c7213" />
                    <stop offset="100%" stopColor="#2f4415" />
                </linearGradient>

                <linearGradient id={g('fieldDeep')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2c3f11" />
                    <stop offset="100%" stopColor="#080f05" />
                </linearGradient>

                <radialGradient id={g('vignette')} cx="0.5" cy="0.42" r="0.78">
                    <stop offset="55%" stopColor="#03080f" stopOpacity="0" />
                    <stop offset="100%" stopColor="#03080f" stopOpacity="0.62" />
                </radialGradient>

                <linearGradient id={g('scrim')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#02070f" stopOpacity="0.72" />
                    <stop offset="42%" stopColor="#02070f" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#02070f" stopOpacity="0" />
                </linearGradient>

                <linearGradient id={g('footer')} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#040a12" stopOpacity="0" />
                    <stop offset="34%" stopColor="#040a12" stopOpacity="0.42" />
                    <stop offset="70%" stopColor="#040a12" stopOpacity="0.76" />
                    <stop offset="100%" stopColor="#04090f" stopOpacity="0.88" />
                </linearGradient>
            </defs>

            {/* ── Sky ──────────────────────────────────────────────────── */}
            <rect width="720" height="1080" fill={`url(#${g('sky')})`} />
            <rect width="720" height="1080" fill={`url(#${g('glow')})`} />

            {/* ── Sun, sitting on the horizon ──────────────────────────── */}
            <circle
                cx="468"
                cy="586"
                r="185"
                fill={`url(#${g('bloom')})`}
                className="padi-bloom"
            />
            <circle cx="468" cy="586" r="54" fill={`url(#${g('sun')})`} />

            {/* ── Distant ridges. Lighter at the base: that is haze, and it is
                   what reads as distance. ─────────────────────────────────── */}
            <path
                d="M -60 612 L 40 566 L 128 592 L 214 540 L 300 586 L 372 558 L 452 600 L 540 552 L 626 594 L 780 566 L 780 660 L -60 660 Z"
                fill={`url(#${g('ridgeFar')})`}
                opacity="0.5"
            />
            <path
                d="M -60 648 L 76 614 L 176 640 L 286 606 L 402 642 L 512 612 L 620 644 L 780 618 L 780 700 L -60 700 Z"
                fill={`url(#${g('ridgeMid')})`}
                opacity="0.75"
            />

            {/* Haze pooling in the valley, dissolving the ridge bases. */}
            <rect y="560" width="720" height="130" fill={`url(#${g('haze')})`} />

            {/* ── Terraced sawah. Flooded paddies mirror the sun; planted ones
                   carry the kuning-hijau of young rice. ───────────────────── */}
            <path d={terrace(662, 730, 12, 8)} fill={`url(#${g('water')})`} opacity="0.85" />
            <path d={terraceCrest(662, 12, 8)} stroke="#ffe6ae" strokeWidth="1.6" fill="none" opacity="0.4" />

            <path d={terrace(714, 796, 16, -10)} fill={`url(#${g('field')})`} opacity="0.92" />
            <path d={terraceCrest(714, 16, -10)} stroke="#ffe6ae" strokeWidth="1.8" fill="none" opacity="0.3" />

            <path d={terrace(778, 872, 20, 14)} fill={`url(#${g('water')})`} opacity="0.6" />
            <path d={terraceCrest(778, 20, 14)} stroke="#ffdc94" strokeWidth="2" fill="none" opacity="0.34" />

            <path d={terrace(852, 980, 26, -18)} fill={`url(#${g('field')})`} />
            <path d={terraceCrest(852, 26, -18)} stroke="#ffe6ae" strokeWidth="2.2" fill="none" opacity="0.22" />

            {/* The sun's reflection, poured down the flooded terraces. */}
            <path
                d="M 430 662 L 508 662 L 552 878 L 384 878 Z"
                fill="#ffdc94"
                opacity="0.16"
            />

            <path d={terrace(918, 1090, 30, 20)} fill={`url(#${g('fieldDeep')})`} />

            {/* ── The crop, in three planes ────────────────────────────── */}
            {bandGroups[0]}
            {bandGroups[1]}

            {/* The scrim goes here, not at the end. Everything above it sinks
                into shadow so the headline has something to sit on; the near
                row below it stays a crisp silhouette with lit grain. */}
            <rect y="470" width="720" height="610" fill={`url(#${g('footer')})`} />

            {bandGroups[2]}

            {/* ── Air ──────────────────────────────────────────────────── */}
            {motes}

            {/* ── Grade. Vignette pulls the eye to the sun; the top scrim
                   buys contrast for the wordmark. ─────────────────────────── */}
            <rect width="720" height="1080" fill={`url(#${g('vignette')})`} />
            <rect width="720" height="420" fill={`url(#${g('scrim')})`} />
        </svg>
    );
}
