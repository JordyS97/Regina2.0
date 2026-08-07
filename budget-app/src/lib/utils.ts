import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Trims a long axis or legend label so it cannot spill outside its chart frame.
 * The untruncated text stays available in the tooltip, which reads the raw
 * data key rather than the formatted tick.
 */
export function truncateLabel(text: string, max = 28) {
    const clean = String(text ?? '');
    return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

/** 'H531-SO BIMA' -> 'H531 BIMA', so nine branches fit a narrow legend. */
export function shortenDealer(dealer: string) {
    return String(dealer ?? '').replace('-SO ', ' ');
}

/**
 * Builds short, mutually distinct axis labels for G/L account names.
 *
 * Names are 'Category:Subcategory' and share long prefixes — plain truncation
 * turns 'Advertising & Promotion:Material-Adv & Promotion' and
 * '...:Free Gift-Adv & Promotion' into the same visible label. The subcategory
 * carries the meaning, so it leads; when two accounts share a subcategory
 * (several categories end in ':Others') the category's first word is prepended
 * to keep the pair apart.
 */
export function glAxisLabels(names: string[], max = 26): string[] {
    const subcategoryOf = (name: string) => {
        const at = name.indexOf(':');
        return at === -1 ? name : name.slice(at + 1);
    };

    const short = names.map(subcategoryOf);
    const seen = short.reduce<Record<string, number>>((acc, s) => {
        acc[s] = (acc[s] || 0) + 1;
        return acc;
    }, {});

    return names.map((name, i) => {
        if (seen[short[i]] === 1) return truncateLabel(short[i], max);
        const at = name.indexOf(':');
        const head = at === -1 ? '' : name.slice(0, at).split(/[\s&]+/)[0];
        return truncateLabel(head ? `${head}:${short[i]}` : short[i], max);
    });
}

/**
 * Builds a CSV from the given rows and hands it to the browser as a download.
 * Excel on Indonesian locales needs the BOM and semicolon separator to open
 * the file with the columns already split.
 */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
    const escape = (value: string | number) => {
        const text = String(value ?? '');
        return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };

    const csv = [headers, ...rows]
        .map(row => row.map(escape).join(';'))
        .join('\r\n');

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
