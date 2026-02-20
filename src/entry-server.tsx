import { renderToString } from 'preact-render-to-string';
import { Router } from 'wouter-preact';
import { MDXProvider } from '@mdx-js/preact';
import { ThemeProvider } from '@clidey/ux';
import * as mdxComponents from './mdx/mdx';
import docsConfig from '../docs/dory.json';

const config = docsConfig as any;

function pathFromFilename(filename: string): string {
  return filename
    .replace(/^.*?docs/, '')
    .replace(/\/?index\.mdx$/, '/')
    .replace(/\.mdx$/, '')
    .toLowerCase();
}

const pages = import.meta.glob('../docs/**/*.mdx');
const allPages = Object.fromEntries(
  Object.entries(pages).map(([path, loader]) => [pathFromFilename(path), loader])
);

function buildNavigation(frontmatter?: Record<string, any>[]) {
  return config.navigation.tabs.map((tab: any) => ({
    title: tab.tab,
    groups: tab.groups.map((group: any) => ({
      title: group.group,
      pages: group.pages.map((page: string) => {
        const href = `/${page}`;
        const fm = frontmatter?.find(f => f.path === href);
        return {
          title: fm?.title || page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' '),
          href,
        };
      })
    }))
  }));
}

export async function render(routePath: string, frontmatter?: Record<string, any>[]): Promise<string> {
  const loader = allPages[routePath];
  if (!loader) return '';

  try {
    const module = await loader() as any;
    const Content = module.default;

    const navigation = buildNavigation(frontmatter);
    const pageFm = frontmatter?.find((fm: any) => fm.path === routePath);

    // Find group/page titles (Layout uses swapped names: "title: group, group: title")
    let groupTitle = '';
    const currentTab = navigation.find((tab: any) =>
      tab.groups.some((group: any) =>
        group.pages.some((page: any) => page.href === routePath)
      )
    );
    if (currentTab) {
      for (const group of currentTab.groups) {
        if (group.pages.some((p: any) => p.href === routePath)) {
          groupTitle = group.title;
        }
      }
    }

    // Prev/next
    const allLinks = navigation.flatMap((tab: any) =>
      tab.groups.flatMap((group: any) => group.pages)
    );
    const linkIndex = allLinks.findIndex((link: any) => link.href === routePath);
    const prevPage = linkIndex > 0 ? allLinks[linkIndex - 1] : null;
    const nextPage = linkIndex < allLinks.length - 1 ? allLinks[linkIndex + 1] : null;

    return renderToString(
      <ThemeProvider>
        <Router ssrPath={routePath}>
          <MDXProvider components={mdxComponents}>
                <div class="flex w-full flex-col">
                  {/* Header — matches src/ui/header.tsx structure */}
                  <header class="sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between bg-white px-4 py-5 shadow-md shadow-gray-900/5 sm:px-6 lg:px-8 dark:shadow-none dark:bg-transparent">
                    <div class="relative flex justify-between gap-6 sm:gap-8 md:grow items-center w-full px-4">
                      <div class="flex items-center grow gap-2">
                        <img src={`/${config.logo.light}`} alt="logo" class="w-8 hidden dark:block" />
                        <img src={`/${config.logo.dark}`} alt="logo" class="w-8 block dark:hidden" />
                        <h1 class="text-base lg:text-2xl font-bold">{config.name}</h1>
                      </div>
                      <nav class="hidden md:block">
                        <ul role="list" class="flex items-center gap-8">
                          {navigation.map((tab: any) => {
                            const isActive = tab === currentTab;
                            return (
                              <li key={tab.title}>
                                <a
                                  href={tab.groups[0].pages[0].href}
                                  class={`text-xs transition hover:opacity-80${isActive ? ' text-brand-foreground' : ''}`}
                                >
                                  {tab.title}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </nav>
                      <div class="hidden md:block md:h-5 md:w-px md:bg-zinc-900/10 md:dark:bg-white/15" />
                      {/* Search, ModeToggle, MobileNav — rendered client-side during hydration.
                           Static placeholders cause ref mismatches with Algolia autocomplete. */}
                      <div class="flex items-center gap-3" data-testid="header-actions" />
                    </div>
                  </header>

                  {/* Container — matches src/ui/layout.tsx structure */}
                  <div id="container" class="relative flex w-full max-w-8xl sm:px-2 lg:px-8">
                    <div class="hidden lg:relative lg:block lg:flex-none">
                      <div class="sticky top-[4.75rem] -ml-0.5 h-[calc(100vh-4.75rem)] w-64 overflow-x-hidden overflow-y-auto py-16 pr-8 pl-0.5 xl:w-72 xl:pr-16">
                        <nav class="dory-navigation text-base lg:text-sm">
                          <ul role="list" class="space-y-9">
                            {currentTab && (
                              <li>
                                <h2 class="font-display font-medium text-xs">{currentTab.title}</h2>
                                {currentTab.groups.map((group: any) => (
                                  <div key={group.title}>
                                    <h3 class="mt-4 text-sm font-semibold">{group.title}</h3>
                                    <ul role="list" class="mt-2 space-y-2 border-l-2 border-slate-100 lg:mt-4 lg:space-y-4 lg:border-slate-200 dark:border-slate-800">
                                      {group.pages.map((page: any) => (
                                        <li key={page.href} class="relative">
                                          <a
                                            href={page.href}
                                            class={routePath === page.href
                                              ? 'block w-full pl-3.5 font-semibold text-brand-foreground before:pointer-events-none before:absolute before:top-1/2 before:-left-1 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full'
                                              : 'block w-full pl-3.5 text-slate-500 before:hidden before:bg-slate-300 hover:text-slate-600 hover:before:block dark:text-slate-400 dark:before:bg-slate-700 dark:hover:text-slate-300 before:pointer-events-none before:absolute before:top-1/2 before:-left-1 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full'}
                                          >
                                            {page.title}
                                          </a>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </li>
                            )}
                          </ul>
                        </nav>
                      </div>
                    </div>

                    <main class="flex grow max-w-full px-4 py-16 sm:px-6 lg:px-8">
                      <div class="min-w-0 w-full">
                        <article class="h-full flex flex-1 flex-col">
                          <div class="flex justify-between items-start">
                            <header class="mb-8">
                              {groupTitle && <h1 class="font-display text-lg tracking-tight">{groupTitle}</h1>}
                              {pageFm?.title && <p class="text-4xl tracking-tight">{pageFm.title}</p>}
                            </header>
                          </div>
                          <div class="flex-1 min-h-[calc(100vh-2rem)]">
                            {/* Matches App > div.antialiased > div.flex > Routes > Content */}
                            <div class="h-full antialiased">
                              <div class="flex min-h-full">
                                <Content />
                              </div>
                            </div>
                          </div>
                          {(prevPage || nextPage) && (
                            <div class="mt-12 pt-6 flex border-t border-black/20 dark:border-white/20">
                              {prevPage && (
                                <div>
                                  <p class="font-display text-sm font-medium">Previous</p>
                                  <div class="mt-1">
                                    <a href={prevPage.href} class="text-base font-semibold hover:opacity-80">{prevPage.title}</a>
                                  </div>
                                </div>
                              )}
                              {nextPage && (
                                <div class="ml-auto text-right">
                                  <p class="font-display text-sm font-medium">Next</p>
                                  <div class="mt-1">
                                    <a href={nextPage.href} class="text-base font-semibold hover:opacity-80">{nextPage.title}</a>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </article>
                      </div>
                    </main>
                  </div>
                </div>
          </MDXProvider>
        </Router>
      </ThemeProvider>
    );
  } catch (error) {
    console.warn(`SSR render failed for ${routePath}:`, error);
    return '';
  }
}
