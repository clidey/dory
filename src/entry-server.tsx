import type { ComponentType } from 'preact';
import { renderToString } from 'preact-render-to-string';
import { Router } from 'wouter-preact';
import { MDXProvider } from '@mdx-js/preact';
import { ThemeProvider } from '@clidey/ux';
import * as mdxComponents from './mdx/mdx';
import docsConfig from '../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from './types/config';
import { PageMeta } from './ui/page-meta';
import { Header } from './ui/header';
import { Navigation } from './components/navigation';
import { BASE_PATH, withBase } from './utils/base-path';

const config = docsConfig as DoryConfig;

const navigationTabs = config.navigation?.tabs ?? [];
if (!config.navigation?.tabs) {
  console.warn('dory.json has no navigation.tabs — SSR navigation will be empty.');
}

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

interface NavPage {
  title: string;
  href: string;
}

interface NavGroup {
  title: string;
  pages: NavPage[];
}

interface NavTab {
  title: string;
  groups: NavGroup[];
}

function buildNavigation(frontmatter?: Record<string, any>[]): NavTab[] {
  return navigationTabs.map(tab => ({
    title: tab.tab,
    groups: tab.groups.map(group => ({
      title: group.group,
      pages: group.pages.map(entry => {
        const page = typeof entry === 'string' ? entry : entry.page;
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
    const module = await loader() as { default: ComponentType };
    const Content = module.default;

    const navigation = buildNavigation(frontmatter);
    const pageFm = frontmatter?.find(fm => fm.path === routePath);

    // Find group/page titles (Layout uses swapped names: "title: group, group: title")
    let groupTitle = '';
    const currentTab = navigation.find(tab =>
      tab.groups.some(group =>
        group.pages.some(page => page.href === routePath)
      )
    );
    if (currentTab) {
      for (const group of currentTab.groups) {
        if (group.pages.some(p => p.href === routePath)) {
          groupTitle = group.title;
        }
      }
    }

    // Prev/next
    const allLinks = navigation.flatMap(tab =>
      tab.groups.flatMap(group => group.pages)
    );
    const linkIndex = allLinks.findIndex(link => link.href === routePath);
    const prevPage = linkIndex > 0 ? allLinks[linkIndex - 1] : null;
    const nextPage = linkIndex < allLinks.length - 1 ? allLinks[linkIndex + 1] : null;

    return renderToString(
      <ThemeProvider>
        <Router base={BASE_PATH} ssrPath={withBase(routePath)}>
          <MDXProvider components={mdxComponents}>
                {/* SYNC NOTE: this shell mirrors src/ui/layout.tsx (non-landing return).
                     Header and Navigation are the real components; Header gets `ssr` so the
                     client-only widgets (search, theme toggle, mobile menu) mount on hydration. */}
                <div class="dory-shell flex min-h-screen w-full flex-col bg-[var(--sidebar)]">
                  <Header ssr />
                  <div class="flex flex-1">
                    <aside class="hidden w-60 shrink-0 lg:block">
                      <div class="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-3 pb-6 pt-4">
                        <Navigation frontmatter={frontmatter} />
                      </div>
                    </aside>
                    <main class="min-w-0 flex-1 bg-background text-foreground rounded-tl-2xl px-6 py-10 sm:px-10 lg:px-12">
                      <article class="dory-article mx-auto flex w-full max-w-[52rem] flex-col">
                        <div class="flex items-start justify-between">
                          <header class="mb-8">
                            {groupTitle && <p class="dory-subtitle text-sm font-medium tracking-widest uppercase mb-2">{groupTitle}</p>}
                            {pageFm?.title && <h1 class="dory-page-title text-4xl tracking-tight">{pageFm.title}</h1>}
                            {pageFm?.lead && <p class="dory-lead">{pageFm.lead}</p>}
                          </header>
                        </div>
                        <PageMeta meta={pageFm?.meta} />
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
                                <p class="font-display text-xs font-medium text-muted-foreground">Previous</p>
                                <div class="mt-1">
                                  <a href={withBase(prevPage.href)} class="text-sm font-semibold hover:opacity-80">{prevPage.title}</a>
                                </div>
                              </div>
                            )}
                            {nextPage && (
                              <div class="ml-auto text-right">
                                <p class="font-display text-xs font-medium text-muted-foreground">Next</p>
                                <div class="mt-1">
                                  <a href={withBase(nextPage.href)} class="text-sm font-semibold hover:opacity-80">{nextPage.title}</a>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </article>
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
