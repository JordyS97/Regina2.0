/**
 * PADI — Proposal Astra Motor Digital.
 *
 * One place for the things that carry the brand, so a rename never again
 * means grepping for a string across a dozen files.
 */

export const APP_NAME = 'PADI';
export const APP_LONG_NAME = 'Proposal Astra Motor Digital';
export const APP_TAGLINE = 'Setiap proposal disemai, ditumbuhkan, dan dipanen.';

/**
 * Categorical series colour ramp.
 *
 * Ordered so that the first three carry the brand — Astra blue, padi green,
 * ripened gold — and Honda red sits far enough down the list that it is never
 * spent on an arbitrary category. Red means something in this product; it is
 * reserved for rejection and over-budget, not for "the fourth dealer".
 */
export const CHART_SERIES = [
    '#0057b8', // astra-600
    '#7a9714', // padi-600
    '#fbba24', // bulir-400
    '#1a72d4', // astra-500
    '#b5d334', // padi-400
    '#d97406', // bulir-600
    '#003872', // astra-800
    '#4a5b15', // padi-800
] as const;

/** Single-series accents, referenced by charts that plot one measure. */
export const CHART_ACCENT = {
    astra: '#0057b8',
    astraSoft: '#4f9cf0',
    padi: '#7a9714',
    bulir: '#fbba24',
    honda: '#cc0000',
    ink: '#002d5c',
    grid: '#e2e8f0',
    axis: '#64748b',
} as const;

/** Proposal lifecycle colours, shared by charts and status chips. */
export const STATUS_COLOR = {
    approved: '#7a9714', // padi-600 — panen
    pending: '#fbba24', // bulir-400 — masih tumbuh
    rejected: '#cc0000', // honda-600 — gagal panen
} as const;
