import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { useLocation } from 'wouter-preact';
import { Navigation } from '../components/navigation';
import { ALL_NAVIGATION, ALL_OPENAPI, completeFrontMatter, loadMDXFrontMatterForPath, loadAllMDXFrontMatter, ALL_PAGES, pathFromFilename, preloadFrontmatter, ALL_ASYNCAPI } from '../components/store';
import { OpenAPI } from '../mdx/open-api';
import { AsyncAPI } from '../mdx/async-api';
import { Header } from './header';
import { PrevNextLinks } from './prev-next-link';
import { TableOfContents } from './table-of-content';
import { Loading } from '../components/loading';
import Dropdown from '../components/dropdown';
import { useNotification } from '../components/notification';
import { SparkleIcon } from 'lucide-react';

interface LayoutProps {
  children: ComponentChildren;
}

const prompt = (pathname: string) => `Please read and analyze the content from this documentation page: ${window.location.origin}${pathname}.mdx\n\n` +
  `Then, help me understand and answer any questions I have about it. ` +
  `Please provide clear, detailed explanations and examples where relevant.`;

export default function Layout({ children }: LayoutProps) {
  const [loading, setLoading] = useState(true);
  const [pathname] = useLocation();
  const { showNotification } = useNotification();

  const handleOpenMDX = useCallback(() => {
    window.open(`${window.location.origin}${pathname}.mdx`, '_blank');
  }, [pathname]);

  const handleCopyMDX = useCallback(() => {
    ALL_PAGES[pathFromFilename(pathname)]().then((mdx) => {
      navigator.clipboard.writeText(mdx.default.toString());
    });
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
    // Try to preload frontmatter first (optimized approach)
    preloadFrontmatter().then(() => {
      // If preloading succeeds, we're done
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
  }, [page]);

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

  return (
    <div className="flex w-full flex-col">
      <Header />
      <div id="container" className="relative flex w-full max-w-8xl sm:px-2 lg:px-8">
        <div className="hidden lg:relative lg:block lg:flex-none">
          <div className="sticky top-[4.75rem] -ml-0.5 h-[calc(100vh-4.75rem)] w-64 overflow-x-hidden overflow-y-auto py-16 pr-8 pl-0.5 xl:w-72 xl:pr-16">
            <Navigation />
          </div>
        </div>
        <main className="flex px-4 py-16 sm:px-6 lg:px-8 grow">
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
                {openAPIJSON && tab && "openapi" in tab && method && path ? 
                  <OpenAPI openAPIJson={JSON.parse(openAPIJSON)} method={method} path={path} />
                 : asyncAPIJSON && tab && "asyncapi" in tab && operation && channel ?
                  <AsyncAPI asyncAPIJson={JSON.parse(asyncAPIJSON)} operation={operation} channel={channel} />
                 : children}
              </div>
              <PrevNextLinks />
            </article>
          </div>
          {
            openAPIJSON == null && asyncAPIJSON == null &&
            <TableOfContents />
          }
        </main>
      </div>
    </div>
  );
}