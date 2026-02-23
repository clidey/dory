import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { Navigation } from '../components/navigation';
import { ALL_NAVIGATION, ALL_OPENAPI, completeFrontMatter, loadMDXFrontMatterForPath, loadAllMDXFrontMatter, ALL_PAGES, pathFromFilename, preloadFrontmatter, ALL_ASYNCAPI, isFrontmatterReady } from '../components/store';
import { usePathname } from '../components/hooks';
import { OpenAPI } from '../mdx/open-api';
import { AsyncAPI } from '../mdx/async-api';
import { Header } from './header';
import { PrevNextLinks } from './prev-next-link';
import { TableOfContents } from './table-of-content';
import { Loading } from '../components/loading';
import Dropdown from '../components/dropdown';
import { useNotification } from '../components/notification';
import { SparkleIcon } from 'lucide-react';
import { useIsEmbedded } from '../components/hooks';
import { ErrorBoundary } from '../components/error-boundary';
import { cn } from '@clidey/ux';

interface LayoutProps {
  children: ComponentChildren;
}

const prompt = (pathname: string) => `Please read and analyze the content from this documentation page: ${window.location.origin}${pathname}.mdx\n\n` +
  `Then, help me understand and answer any questions I have about it. ` +
  `Please provide clear, detailed explanations and examples where relevant.`;

export default function Layout({ children }: LayoutProps) {
  const [loading, setLoading] = useState(!isFrontmatterReady());
  const rawPathname = usePathname();
  const pathname = rawPathname === '/' ? ALL_NAVIGATION[0]?.groups[0]?.pages[0]?.href ?? '/' : rawPathname;
  const { showNotification } = useNotification();
  const isEmbedded = useIsEmbedded();

  const handleOpenMDX = useCallback(() => {
    window.open(`${window.location.origin}${pathname}.mdx`, '_blank');
  }, [pathname]);

  const handleCopyMDX = useCallback(() => {
    const mod = ALL_PAGES[pathFromFilename(pathname)];
    if (mod) navigator.clipboard.writeText((mod as any).default.toString());
    showNotification('Copied to clipboard');
  }, []);
  const handleOpenChatGPT = useCallback(() => {
    const url = `https://chat.openai.com/?q=${encodeURIComponent(prompt(pathname))}`;
    window.open(url, '_blank');
  }, [pathname]);
  const handleOpenAnthropic = useCallback(() => {
    const url = `https://claude.ai/new?q=${encodeURIComponent(prompt(pathname))}`;
    window.open(url, '_blank');
  }, [pathname]);

  const dropdownItems = useMemo(() => [
    {
      label: 'Open MDX',
      onClick: handleOpenMDX,
    },
    {
      label: 'Copy MDX',
      onClick: handleCopyMDX
    },
    {
      label: 'Open in ChatGPT',
      onClick: handleOpenChatGPT
    },
    {
      label: 'Open in Anthropic',
      onClick: handleOpenAnthropic
    }
  ], [handleOpenMDX, handleCopyMDX, handleOpenChatGPT, handleOpenAnthropic]);

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
    const group = ALL_NAVIGATION.flatMap((tab) =>
      tab.groups.find((group) =>
        group.pages.some((page) => page.href === pathname)
      )
    );
    const page = completeFrontMatter.find((page) => page.path === pathname);

    return { group: group[0]?.title, title: page?.title, page };
  }, [pathname, loading]);

  // Update document title and meta tags when page changes
  useEffect(() => {
    if (page?.title) {
      document.title = page.title;

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

    // Add/update JSON-LD structured data
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          'headline': page?.title || document.title,
          'description': page?.description || '',
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [
            {
              '@type': 'ListItem',
              'position': 1,
              'name': 'Home',
              'item': window.location.origin
            },
            ...(page?.title ? [{
              '@type': 'ListItem',
              'position': 2,
              'name': page.title,
              'item': window.location.href
            }] : [])
          ]
        }
      ]
    };

    let ldScript = document.querySelector('script[type="application/ld+json"]');
    if (!ldScript) {
      ldScript = document.createElement('script');
      ldScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(structuredData);
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

  if (isLandingPage) {
    return (
      <div className="flex w-full flex-col">
        <Header />
        <main className="w-full">
          <ErrorBoundary fallback={(error) => (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <p className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                This page failed to render
              </p>
              <pre className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3 max-w-md overflow-auto">
                {error.message}
              </pre>
            </div>
          )}>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col">
      <Header />
      <div id="container" className={cn("relative flex w-full", {
        "max-w-8xl sm:px-2 lg:px-8": !isEmbedded,
        "px-0": isEmbedded,
      })}>
        <div className={cn("hidden lg:relative lg:block lg:flex-none", {
          "lg:hidden": isEmbedded,
        })}>
          <div className="sticky top-[4.75rem] -ml-0.5 h-[calc(100vh-4.75rem)] w-64 overflow-x-hidden overflow-y-auto py-16 pr-8 pl-0.5 xl:w-72 xl:pr-16">
            <Navigation />
          </div>
        </div>
        <main className={cn("flex grow max-w-full", {
          "px-4 py-16 sm:px-6 lg:px-8": !isEmbedded,
          "p-8": isEmbedded,
        })}>
          <div className="min-w-0 w-full">
            <article className="h-full flex flex-1 flex-col">
              <div className="flex justify-between items-start">
                <header className="mb-8">
                  {title && (
                    <h1 className="font-display text-lg tracking-tight">
                      {title}
                    </h1>
                  )}
                  {group && (
                    <p className="text-4xl tracking-tight">
                      {group}
                    </p>
                  )}
                </header>
                {
                  openAPIJSON == null && asyncAPIJSON == null &&
                  <Dropdown className="gap-0" buttonLabel={<SparkleIcon className="w-4 h-4" />} items={dropdownItems} />
                }
              </div>
              <div className="flex-1 min-h-[calc(100vh-2rem)]">
                <ErrorBoundary fallback={(error) => (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <p className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                      This page failed to render
                    </p>
                    <pre className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md p-3 max-w-md overflow-auto">
                      {error.message}
                    </pre>
                  </div>
                )}>
                  {openAPIJSON && tab && "openapi" in tab && method && path ?
                    <OpenAPI openAPIJson={JSON.parse(openAPIJSON)} method={method} path={path} />
                   : asyncAPIJSON && tab && "asyncapi" in tab && operation && channel ?
                    <AsyncAPI asyncAPIJson={JSON.parse(asyncAPIJSON)} operation={operation} channel={channel} />
                   : children}
                </ErrorBoundary>
              </div>
              <PrevNextLinks />
            </article>
          </div>
          {
            openAPIJSON == null && asyncAPIJSON == null && !isEmbedded &&
            <TableOfContents />
          }
        </main>
      </div>
    </div>
  );
}