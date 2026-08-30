import React, { lazy } from 'react';

/**
 * Utility to wrap React.lazy imports with automatic reload on dynamic import failure.
 * When a new deployment occurs, old hashed JS chunks no longer exist on the server,
 * causing "Failed to fetch dynamically imported module" errors.
 * This helper catches the error, refreshes the page once to pull the latest index.html and assets.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error: any) {
      const isDynamicImportError =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.message?.includes('error loading dynamically imported module') ||
        error?.name === 'ChunkLoadError';

      if (!pageHasBeenForceRefreshed && isDynamicImportError) {
        // Assume user is running an older bundle version and reload page to fetch latest deployment
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        // Return a pending promise so React doesn't throw before the reload finishes
        return new Promise<{ default: T }>(() => {});
      }

      throw error;
    }
  });
}
