import { useEffect, useMemo } from 'preact/hooks';
import { Route, Router, useLocation } from 'wouter-preact';
import { usePathname } from './hooks';
import { ALL_PAGES, getNavigationForPath, pageModules, resolvePagePath } from './store';
import { lazy, Suspense } from 'preact/compat';
import { Loading } from './loading';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { contentScope } from '../utils/content-scope';
import { NotFoundPage } from '@clidey/ux';

// Stable identities avoid remounting loaded pages on unrelated renders.
const lazyPages = Object.fromEntries(Object.keys(ALL_PAGES).map(path => [path, lazy(async () => {
  const module = await pageModules.load(path);
  if (!module) throw new Error(`Page not found: ${path}`);
  return module;
})]));

export default function Routes() {
  const pathname = usePathname();
  const [, navigate] = useLocation();
  const scope = contentScope(docsConfig as DoryConfig, pathname);
  const isScopeRoot = !ALL_PAGES[pathname] && (pathname === '/' || (Boolean(scope.prefix) && pathname === scope.prefix));

  // Redirect root to the first page so the URL reflects the actual content
  useEffect(() => {
    if (isScopeRoot) {
      const firstPage = getNavigationForPath(pathname)[0]?.groups[0]?.pages[0]?.href;
      if (firstPage) navigate(firstPage, { replace: true });
    }
  }, [pathname]);

  const route = useMemo(() => {
    const targetPath = resolvePagePath(pathname);
    if (!ALL_PAGES[targetPath]) return null;
    return {
      path: pathname,
      key: targetPath,
      component: pageModules.get(targetPath)?.default ?? lazyPages[targetPath],
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
      <Suspense fallback={<Loading showText />}>
        {route && <Route key={route.key} path={route.path}>{() => <route.component />}</Route>}
      </Suspense>
    </Router>
  );
}
