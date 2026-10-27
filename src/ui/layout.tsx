import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { Navigation } from '../components/navigation';
import { ALL_NAVIGATION, ALL_OPENAPI, completeFrontMatter, loadMDXFrontMatterForPath, loadAllMDXFrontMatter, preloadFrontmatter, ALL_ASYNCAPI, isFrontmatterReady } from '../components/store';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { usePathname } from '../components/hooks';
import { OpenAPI } from '../mdx/open-api';
import { AsyncAPI } from '../mdx/async-api';
import { Header } from './header';
import { PrevNextLinks } from './prev-next-link';
import { PageMeta } from './page-meta';
import { Breadcrumb } from './breadcrumb';
import { PageActions } from './page-actions';
import { PageFeedback } from './page-feedback';
import { PageFooter } from './page-footer';
import { TableOfContents } from './table-of-content';
import { Loading } from '../components/loading';
import { useIsEmbedded } from '../components/hooks';
import { ErrorBoundary } from '../components/error-boundary';
import { cn } from '@clidey/ux';

const config = docsConfig as DoryConfig;

interface LayoutProps {
  children: ComponentChildren;
}

/**
 * Main documentation layout: header, sidebar navigation, breadcrumb and page
 * actions, article content, feedback, prev/next cards, footer, and the
 * "On this page" rail.
 *
 * SYNC NOTE: src/entry-server.tsx renders a static SSR copy of this layout's
 * shell (the .dory-shell / aside / main / article wrappers in render()).
 * If you change that markup structure here, update entry-server.tsx to match
 * or hydration will mismatch.
 */
export default function Layout({ children }: LayoutProps) {
  const [loading, setLoading] = useState(!isFrontmatterReady());
  const rawPathname = usePathname();
  const pathname = rawPathname === '/' ? ALL_NAVIGATION[0]?.groups[0]?.pages[0]?.href ?? '/' : rawPathname;
  const isEmbedded = useIsEmbedded();

  // Client-side navigation keeps the previous scroll position, so start each new
  // page at the top. The initial load keeps the browser's own position, and a
  // hash means an in-page anchor is the target.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  useEffect(() => {
    // Try to preload frontmatter first (optimized approach).
    // If inline data was available from SSR, preloadFrontmatter() resolves immediately.
    preloadFrontmatter().then(() => {
      setLoading(false);
    }).catch(() => {
      // Fallback to the original approach
      loadMDXFrontMatterForPath(pathname).then(() => {
        loadAllMDXFrontMatter(pathname).then(() => {
          setLoading(false);
        }).catch(() => {
          setLoading(false);
        });
      }).catch(() => {
        setLoading(false);
      });
    });
  }, [pathname]);


  const { title: group, group: title, page } = useMemo(() => {
    const group = ALL_NAVIGATION
      .flatMap((tab) => tab.groups)
      .find((group) => group.pages.some((page) => page.href === pathname));
    const page = completeFrontMatter.find((page) => page.path === pathname);

    return { group: group?.title, title: page?.title, page };
  }, [pathname, loading]);

  // Update document title and meta tags when page changes
  useEffect(() => {
    if (page?.title) {
      // Mirror the build-time SSR title template (config.seo.titleTemplate, e.g. "%s — Site")
      const titleTemplate = (config as { seo?: { titleTemplate?: string } }).seo?.titleTemplate;
      document.title = titleTemplate ? titleTemplate.replace('%s', page.title) : page.title;

      // Update Open Graph title
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', page.title);
      }

      // Update Twitter title
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute('content', page.title);
      }
    }

    if (page?.description) {
      // Update standard meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', page.description);
      }

      // Update Open Graph description
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', page.description);
      }

      // Update Twitter description
      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      if (twitterDescription) {
        twitterDescription.setAttribute('content', page.description);
      }
    }

    // Update canonical URL
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', window.location.href);
    }

    // Add/update canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}${window.location.pathname}`);

    // JSON-LD structured data is emitted at build time (prerender) — crawlers consume
    // that version, so it is intentionally not rewritten on client-side navigation.
  }, [page]);

  const isLandingPage = useMemo(() => {
    const firstTab = ALL_NAVIGATION[0];
    if (!firstTab) return false;
    return (
      firstTab.groups.length === 1 &&
      firstTab.groups[0].pages.length === 1 &&
      pathname === firstTab.groups[0].pages[0].href
    );
  }, [pathname]);

  const tab = useMemo(() => {
    return completeFrontMatter.find((page) => page.path === pathname);
  }, [pathname, loading]);

  const openAPIJSON = useMemo(() => {
    if (tab == null || tab.openapi == null) {
      return null;
    }
    const firstDirectory = `/${tab.path.split('/')[1]}`;
    return ALL_OPENAPI[`${firstDirectory}/openapi.json`].default;
  }, [tab, loading]);

  const { method, path } = useMemo(() => {
    if (tab == null || tab.openapi == null) {
      return { method: '', path: '' };
    }
    return { method: tab.openapi.split(' ')[0], path: tab.openapi.split(' ')[1] };
  }, [tab, loading]);

  const asyncAPIJSON = useMemo(() => {
    if (tab == null || tab.asyncapi == null) {
      return null;
    }
    const firstDirectory = `/${tab.path.split('/')[1]}`;
    return ALL_ASYNCAPI[`${firstDirectory}/asyncapi.json`].default;
  }, [tab, loading]);
  
  const { operation, channel } = useMemo(() => {
    if (tab == null || tab.asyncapi == null) {
      return { operation: '', channel: '' };
    }
    return { operation: tab.asyncapi.split(' ')[0].toLowerCase(), channel: tab.asyncapi.split(' ')[1] };
  }, [tab, loading]);

  if (loading) return <div className="h-[25vh] flex grow"><Loading /></div>;

  const errorFallback = (error: Error) => (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <p className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
        This page failed to render
      </p>
      <pre className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3 max-w-md overflow-auto">
        {error.message}
      </pre>
    </div>
  );

  const content = openAPIJSON && tab && "openapi" in tab && method && path
    ? <OpenAPI openAPIJson={JSON.parse(openAPIJSON)} method={method} path={path} />
    : asyncAPIJSON && tab && "asyncapi" in tab && operation && channel
      ? <AsyncAPI asyncAPIJson={JSON.parse(asyncAPIJSON)} operation={operation} channel={channel} />
      : children;

  const showSidebar = !isEmbedded && !isLandingPage;
  // OpenAPI pages lay out their own two columns, so they skip the TOC and take its width.
  const isOpenAPIPage = openAPIJSON != null;

  return (
    <div className="dory-shell flex min-h-screen w-full flex-col bg-[var(--sidebar)]">
      <Header />
      <div className="flex flex-1">
        {showSidebar && (
          <aside className="hidden w-60 shrink-0 lg:block">
            <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-3 pb-6 pt-4">
              <Navigation />
            </div>
          </aside>
        )}
        <main className={cn("dory-main min-w-0 flex-1 bg-background text-foreground", {
          "px-6 py-10 sm:px-10 lg:px-12": showSidebar,
          "px-6 py-10 sm:px-10": isLandingPage && !isEmbedded,
          "p-8": isEmbedded,
        })}>
          {isLandingPage ? (
            <ErrorBoundary fallback={errorFallback}>{children}</ErrorBoundary>
          ) : (
            <div className="mx-auto flex w-full max-w-[66rem] justify-center gap-14">
              <article className={cn("dory-article flex min-w-0 flex-1 flex-col", isOpenAPIPage ? "max-w-[66rem]" : "max-w-[47rem]")}>
                <div className="mb-6 flex min-h-9 flex-wrap items-center justify-between gap-4">
                  <Breadcrumb group={title} title={group} />
                  <PageActions pathname={pathname} />
                </div>
                <header className="mb-10">
                  {group && <h1 className="dory-page-title">{group}</h1>}
                  {page?.lead && <p className="dory-lead">{page.lead}</p>}
                </header>
                <PageMeta meta={page?.meta} />
                <div className="flex-1 min-h-[calc(100vh-2rem)]">
                  <ErrorBoundary fallback={errorFallback}>{content}</ErrorBoundary>
                </div>
                <PageFeedback pathname={pathname} />
                <PrevNextLinks />
                <PageFooter />
              </article>
              {!isOpenAPIPage && <TableOfContents />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
