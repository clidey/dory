import { useEffect, useState } from 'preact/hooks';
import { useLocation } from 'wouter-preact';

/**
 * Custom hook to get the current pathname
 */
export const usePathname = () => {
  const [pathname] = useLocation();
  return pathname;
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
