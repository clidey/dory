import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { withBase } from '../utils/base-path';

const initialEmbedParams = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embedded') === 'true'
  ? new URLSearchParams(window.location.search) : null;

/**
 * Strips trailing slash from a pathname (except root "/").
 */
function normalizePathname(pathname: string): string {
  if (pathname !== '/' && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/**
 * Custom hook to get the current pathname, normalized to strip trailing slashes.
 */
export const usePathname = () => {
  const [pathname] = useLocation();
  const normalized = normalizePathname(pathname);

  useEffect(() => {
    if (pathname !== normalized) {
      window.history.replaceState(null, '', withBase(normalized) + window.location.search + window.location.hash);
    }
  }, [pathname, normalized]);

  return normalized;
};

/**
 * Custom hook to get the URL search params as a URLSearchParams instance
 */
export const useSearchParams = () => {
  const [searchParams, setSearchParams] = useState(
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  );

  useEffect(() => {
    const handlePopState = () => {
      setSearchParams(new URLSearchParams(window.location.search));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return searchParams;
};

/**
 * Custom hook to check if the app is in embedded mode
 */
export const useIsEmbedded = () => {
  const searchParams = useSearchParams();
  const [pathname] = useLocation();

  useEffect(() => {
    if (!initialEmbedParams) return;
    const params = new URLSearchParams(window.location.search);
    let changed = false;
    for (const key of ['embedded', 'parentOrigin', 'theme']) {
      const value = initialEmbedParams.get(key);
      if (value !== null && params.get(key) !== value) {
        params.set(key, value);
        changed = true;
      }
    }
    if (changed) window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params}${window.location.hash}`);
  }, [pathname]);

  return searchParams.get('embedded') === 'true' || initialEmbedParams !== null;
};
