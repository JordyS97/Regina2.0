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
