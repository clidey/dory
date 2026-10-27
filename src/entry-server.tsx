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
import { Breadcrumb } from './ui/breadcrumb';
import { PageFeedback } from './ui/page-feedback';
import { PageFooter } from './ui/page-footer';
import { PrevNextLinks } from './ui/prev-next-link';
import { TableOfContents } from './ui/table-of-content';
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

    const isOpenAPIPage = Boolean(pageFm?.openapi);

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
                    <main class="dory-main min-w-0 flex-1 bg-background text-foreground px-6 py-10 sm:px-10 lg:px-12">
                      <div class="mx-auto flex w-full max-w-[66rem] justify-center gap-14">
                        <article class={`dory-article flex min-w-0 flex-1 flex-col ${isOpenAPIPage ? 'max-w-[66rem]' : 'max-w-[47rem]'}`}>
                          {/* Page actions (Copy page / AI actions) are client-only and mount on hydration. */}
                          <div class="mb-6 flex min-h-9 flex-wrap items-center justify-between gap-4">
                            <Breadcrumb group={groupTitle} title={pageFm?.title} />
                          </div>
                          <header class="mb-10">
                            {pageFm?.title && <h1 class="dory-page-title">{pageFm.title}</h1>}
                            {pageFm?.lead && <p class="dory-lead">{pageFm.lead}</p>}
                          </header>
                          <PageMeta meta={pageFm?.meta} />
                          <div class="flex-1 min-h-[calc(100vh-2rem)]">
                            {/* Matches App > div.antialiased > div.flex > Routes > Content */}
                            <div class="h-full antialiased">
                              <div class="flex min-h-full">
                                <Content />
                              </div>
                            </div>
                          </div>
                          <PageFeedback pathname={routePath} />
                          <PrevNextLinks navigation={navigation} />
                          <PageFooter />
                        </article>
                        {!isOpenAPIPage && <TableOfContents />}
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
