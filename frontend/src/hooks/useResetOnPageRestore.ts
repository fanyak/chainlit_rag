import { useEffect } from 'react';

/**
 * Custom hook that calls a callback when the page is restored from bfcache (back-forward cache).
 * Useful for resetting state when the user navigates back using the browser's back button.
 *
 * @param callback - Function to call when the page is restored from cache
 *
 * @example
 * ```tsx
 * const [isLoading, setIsLoading] = useState(false);
 * useResetOnPageRestore(() => setIsLoading(false));
 * ```
 */
export function useResetOnPageRestore(callback: () => void): void {
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from bfcache
        callback();
      }
    };

    window.addEventListener('pageshow', handlePageShow);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [callback]);
}
