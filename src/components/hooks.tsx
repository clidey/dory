import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'wouter-preact';

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
      window.history.replaceState(null, '', normalized + window.location.search + window.location.hash);
    }
  }, [pathname, normalized]);

  return normalized;
};

/**
 * Custom hook to get the URL search params as a URLSearchParams instance
 */
export const useSearchParams = () => {
  const [searchParams, setSearchParams] = useState(new URLSearchParams(window.location.search));

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
  return searchParams.get('embedded') === 'true';
};
