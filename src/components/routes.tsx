import { useEffect, useMemo } from 'preact/hooks';
import { Route, Router, useLocation } from 'wouter-preact';
import { usePathname } from './hooks';
import { ALL_PAGES, getNavigationForPath, pathFromFilename } from './store';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { contentScope } from '../utils/content-scope';
import { NotFoundPage } from '@clidey/ux';


export default function Routes() {
  const pathname = usePathname();
  const [, navigate] = useLocation();
  const scope = contentScope(docsConfig as DoryConfig, pathname);
  const isScopeRoot = pathname === '/' || (Boolean(scope.prefix) && pathname === scope.prefix);

  // Redirect root to the first page so the URL reflects the actual content
  useEffect(() => {
    if (isScopeRoot) {
      const firstPage = getNavigationForPath(pathname)[0]?.groups[0]?.pages[0]?.href;
      if (firstPage) navigate(firstPage, { replace: true });
    }
  }, [pathname]);

  const route = useMemo(() => {
    let targetPath = pathname;
    if (isScopeRoot) {
      const ssrRoute = typeof window !== 'undefined' ? window.__DORY_ROUTE__ : undefined;
      targetPath = (pathname === '/' ? ssrRoute : undefined) || getNavigationForPath(pathname)[0]?.groups[0]?.pages[0]?.href || pathname;
    }

    const entry = Object.entries(ALL_PAGES).find(([path]) => path === targetPath);
    if (!entry) return null;

    const [path, mod] = entry;
    return {
      path: isScopeRoot ? pathname : pathFromFilename(path),
      component: (mod as any).default,
    };
  }, [pathname]);

  // 404 — no MDX module for this path (even if it appears in navigation)
  if (!route && pathname !== '/') {
    return (
      <NotFoundPage
        description={`The page ${pathname} does not exist.`}
        onHome={() => navigate(getNavigationForPath(pathname)[0]?.groups[0]?.pages[0]?.href ?? '/')}
        homeLabel="Go to home"
      />
    );
  }

  return (
    <Router>
      {route && <Route key={route.path} path={route.path} component={route.component} />}
    </Router>
  );
}
