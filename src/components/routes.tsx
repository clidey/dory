import { useEffect, useState } from 'preact/hooks';
import { Route, Router, useLocation } from 'wouter-preact';
import { ALL_NAVIGATION, ALL_PAGES, pathFromFilename } from './store';
import { Loading } from './loading';


export default function Routes() {
  const [routes, setRoutes] = useState<any[]>([]);
  const baseUrl = import.meta.env.BASE_URL || '/';

  // Get the pathname from window.location and strip the base URL
  const getRelativePathname = () => {
    let path = window.location.pathname;
    if (baseUrl !== '/' && path.startsWith(baseUrl)) {
      path = path.slice(baseUrl.length - 1); // Keep the leading /
    }
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return path;
  };

  const [pathname, setPathname] = useState(getRelativePathname());
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(true);

  // Listen to browser navigation changes
  useEffect(() => {
    const handleLocationChange = () => {
      setPathname(getRelativePathname());
    };

    window.addEventListener('popstate', handleLocationChange);
    // Also listen to pushState and replaceState
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function(...args) {
      originalPushState.apply(window.history, args);
      handleLocationChange();
    };

    window.history.replaceState = function(...args) {
      originalReplaceState.apply(window.history, args);
      handleLocationChange();
    };

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [baseUrl]);

  useEffect(() => {
    const links = document.querySelectorAll('.dory-navigation a');
    const listeners: (() => void)[] = [];
    const preloaded = new Set();
  
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
  
      const loaderEntry = Object.entries(ALL_PAGES).find(
        ([path]) => path === href
      );
  
      if (!loaderEntry) return;
  
      const [path, loader] = loaderEntry;
  
      const handleMouseEnter = () => {
        if (!preloaded.has(path)) {
          loader();
          preloaded.add(path);
        }
      };
  
      link.addEventListener('mouseenter', handleMouseEnter);
      listeners.push(() => link.removeEventListener('mouseenter', handleMouseEnter));
    });
  
    return () => {
      listeners.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const loadRoutes = async () => {
      // For root path, load the first navigation page
      const targetPath = pathname === '/' ? ALL_NAVIGATION[0].groups[0].pages[0].href : pathname;
      
      const entries = await Promise.all(
        Object.entries(ALL_PAGES).filter(([path]) => path === targetPath).map(async ([path, loader]) => {
          const module = await loader();
          const routePath = pathname === '/' ? '/' : pathFromFilename(path);
          return {
            path: routePath,
            component: module.default,
          };
        })
      );  
      setRoutes(entries);
      setLoading(false);
    };

    loadRoutes();
  }, [pathname]);

  useEffect(() => {
    const page = ALL_NAVIGATION.find((tab) => tab.groups.find((group) => group.pages.find((page) => page.href === pathname)));
    if (!page && pathname !== '/') {
      navigate(ALL_NAVIGATION[0].groups[0].pages[0].href);
      window.location.reload();
    }
  }, [routes, pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  

  if (loading) return <div className="h-[25vh] flex grow"><Loading /></div>;

  return (
    <Router base={baseUrl}>
      {routes.map(({ path, component: Component }) => (
        <Route key={path} path={path} component={Component} />
      ))}
    </Router>
  );
}
