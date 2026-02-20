import { useEffect, useMemo } from 'preact/hooks';
import { Route, Router, useLocation } from 'wouter-preact';
import { usePathname } from './hooks';
import { ALL_NAVIGATION, ALL_PAGES, pathFromFilename } from './store';


export default function Routes() {
  const pathname = usePathname();
  const [, navigate] = useLocation();

  // Redirect root to the first page so the URL reflects the actual content
  useEffect(() => {
    if (pathname === '/') {
      const firstPage = ALL_NAVIGATION[0]?.groups[0]?.pages[0]?.href;
      if (firstPage) navigate(firstPage, { replace: true });
    }
  }, [pathname]);

  const route = useMemo(() => {
    let targetPath = pathname;
    if (pathname === '/') {
      const ssrRoute = typeof window !== 'undefined' && (window as any).__DORY_ROUTE__;
      targetPath = ssrRoute || ALL_NAVIGATION[0].groups[0].pages[0].href;
    }

    const entry = Object.entries(ALL_PAGES).find(([path]) => path === targetPath);
    if (!entry) return null;

    const [path, mod] = entry;
    return {
      path: pathname === '/' ? '/' : pathFromFilename(path),
      component: (mod as any).default,
    };
  }, [pathname]);

  // 404
  if (!route) {
    const page = ALL_NAVIGATION.find((tab) => tab.groups.find((group) => group.pages.find((page) => page.href === pathname)));
    if (!page && pathname !== '/') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
          <h1 className="text-6xl font-bold text-gray-300 dark:text-gray-700 mb-4">404</h1>
          <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
            The page <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-sm">{pathname}</code> doesn't exist.
          </p>
          <button
            onClick={() => navigate(ALL_NAVIGATION[0].groups[0].pages[0].href)}
            className="px-4 py-2 text-sm font-medium rounded-md bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
          >
            Go to Home
          </button>
        </div>
      );
    }
  }

  return (
    <Router>
      {route && <Route key={route.path} path={route.path} component={route.component} />}
    </Router>
  );
}
