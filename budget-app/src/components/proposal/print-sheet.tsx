'use client';

import React, { useCallback, useEffect, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

/** Marks the body so the print stylesheet knows to hide everything else. */
const PRINTING_CLASS = 'padi-printing';

/**
 * The copy of the document that reaches the printer.
 *
 * It is portalled to `document.body` rather than rendered in place, for one
 * concrete reason: the same document is printed from inside a modal, and a
 * modal is a fixed, clipped, scrollable box. Printing the node in place would
 * cut the sheet off at the bottom of that box. As a direct child of body it has
 * no clipping ancestor, so the stylesheet can hide the app around it with a
 * single rule and let the sheet paginate normally.
 *
 * Hidden on screen; the print stylesheet is what reveals it.
 */
export function PrintPortal({ children }: { children: React.ReactNode }) {
    // Portals need a DOM to aim at, which server rendering does not have.
    // `useSyncExternalStore` reports server and client differently without a
    // state write in an effect, so hydration stays a single pass.
    const isClient = useSyncExternalStore(subscribeNever, () => true, () => false);

    if (!isClient) return null;

    return createPortal(<div className="padi-print-root">{children}</div>, document.body);
}

/** Nothing to subscribe to: whether we are on the client never changes. */
function subscribeNever() {
    return () => { };
}

/**
 * Print on demand.
 *
 * The body class goes on before the dialog opens and comes off on `afterprint`
 * — never on a timer, because Chrome's print preview is asynchronous and a
 * timer would strip the styles while the user is still looking at the preview.
 */
export function usePrintSheet() {
    return useCallback(() => {
        if (typeof window === 'undefined') return;

        document.body.classList.add(PRINTING_CLASS);

        const cleanup = () => document.body.classList.remove(PRINTING_CLASS);
        window.addEventListener('afterprint', cleanup, { once: true });

        // Two frames so the class has actually been applied to the layout
        // before the browser snapshots the page.
        requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
    }, []);
}

/**
 * For a page that *is* the document.
 *
 * The class stays on for the page's whole life so Ctrl+P produces the same
 * output as the toolbar button.
 */
export function useAlwaysPrintable() {
    useEffect(() => {
        document.body.classList.add(PRINTING_CLASS);
        return () => document.body.classList.remove(PRINTING_CLASS);
    }, []);
}
