"use client";

import { useEffect } from "react";

export function DevOverlayDisabler() {
    useEffect(() => {
        // Disable Next.js dev overlay
        if (typeof window !== "undefined") {
            // Try to disable the dev overlay by removing it from the DOM
            const disableDevOverlay = () => {
                // Remove the Next.js dev overlay elements
                const overlays = document.querySelectorAll('[data-nextjs-dev-overlay]');
                overlays.forEach(overlay => overlay.remove());

                // Also try to find and remove the Turbopack dev toolbar
                const devToolbar = document.querySelector('[data-turbopack-dev-toolbar]');
                if (devToolbar) {
                    devToolbar.remove();
                }

                // Remove any elements with dev overlay classes
                const devElements = document.querySelectorAll('.nextjs-dev-overlay, .turbopack-dev-overlay, [class*="dev-overlay"]');
                devElements.forEach(element => element.remove());

                // Try to find the circular "N" button
                const nButton = document.querySelector('button[data-nextjs-dev-toolbar]');
                if (nButton) {
                    nButton.remove();
                }
            };

            // Run immediately
            disableDevOverlay();

            // Also run after a short delay to catch dynamically added elements
            setTimeout(disableDevOverlay, 100);
            setTimeout(disableDevOverlay, 500);
            setTimeout(disableDevOverlay, 1000);

            // Set up a mutation observer to catch any newly added overlay elements
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node instanceof Element) {
                            if (node.matches('[data-nextjs-dev-overlay], [data-turbopack-dev-toolbar], .nextjs-dev-overlay, .turbopack-dev-overlay')) {
                                node.remove();
                            }
                        }
                    });
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });

            // Cleanup
            return () => {
                observer.disconnect();
            };
        }
    }, []);

    return null;
}
