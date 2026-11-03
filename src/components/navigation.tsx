import { CatalogIcon } from '@clidey/ux'
import type { ComponentChildren } from 'preact';

import { Link } from 'wouter-preact';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { DocsNavigationView, type NavigationPage } from '../ui/docs-navigation-view';
import { usePathname } from './hooks';
import { ALL_PAGES, completeFrontMatter, getNavigationForPath } from './store';
import { contentScope, scopedPath } from '../utils/content-scope';
import { withBase } from '../utils/base-path';

const config = docsConfig as DoryConfig;

type Frontmatter = Record<string, any>;

/** Sidebar label for a page. API pages show a method tag and their path or message name. */
function pageLabel(href: string, title: string, frontmatter: Frontmatter[]): { method?: string; title: string } {
  const fm = frontmatter.find((entry) => entry.path === href);
  if (typeof fm?.openapi === 'string') {
    const [verb, path] = fm.openapi.split(' ');
    const method = verb.toUpperCase() === 'DELETE' ? 'DEL' : verb.toUpperCase();
    return { method, title: path ?? title };
  }
  if (typeof fm?.asyncapi === 'string') {
    const [operation] = fm.asyncapi.split(' ');
    return { method: operation.toLowerCase() === 'publish' ? 'PUB' : 'SUB', title };
  }
  return { title };
}

/** Static-site adapter for Dory's shared documentation navigation. */
export function Navigation({ frontmatter = completeFrontMatter }: { frontmatter?: Frontmatter[] }) {
  const pathname = usePathname();
  const scope = contentScope(config, pathname);
  const navigation = getNavigationForPath(pathname);
  const switchTo = (locale: string, version: string) => {
    const candidate = scopedPath(config, pathname, locale, version);
    if (ALL_PAGES[candidate]) return candidate;
    return getNavigationForPath(candidate)[0]?.groups[0]?.pages[0]?.href ?? '/';
  };
  const effectivePath = pathname === '/'
    ? navigation[0]?.groups[0]?.pages[0]?.href ?? '/'
    : pathname;
  const groups = navigation.flatMap(tab => tab.groups).map(group => ({
    title: group.title,
    pages: group.pages.map(page => {
      const translatedTitle = frontmatter.find(entry => entry.path === page.href)?.title ?? page.title;
      return { ...page, ...pageLabel(page.href, translatedTitle, frontmatter) };
    }),
  }));
  const currentVersion = config.versions?.find(version => version.id === scope.version);
  const versionLabel = currentVersion?.label ?? config.version;
  const versionSelect = config.versions && config.versions.length > 0 ? <>
    <CatalogIcon name="up-down" aria-hidden="true" className="h-3.5 w-3.5 text-white/50" />
    {/* Transparent native select over the card: keyboard and screen-reader friendly. */}
    <select
      aria-label="Version"
      value={scope.version}
      onChange={event => {
        const id = (event.target as HTMLSelectElement).value;
        const version = config.versions?.find(entry => entry.id === id || entry.url === id);
        const target = version?.url ?? withBase(switchTo(scope.locale, id));
        window.location.href = target;
      }}
      className="absolute inset-0 cursor-pointer opacity-0"
    >
      <option value="">{config.version}</option>
      {config.versions.map(version => <option key={version.id ?? version.url} value={version.id ?? version.url}>{version.label}</option>)}
    </select>
  </> : undefined;
  const languageSelect = config.i18n && config.i18n.locales.length > 1 ?
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white">
      <span className="dory-mono-label">Language</span>
      <select
        aria-label="Language"
        value={scope.locale}
        onChange={event => { window.location.href = withBase(switchTo((event.target as HTMLSelectElement).value, scope.version)); }}
        className="min-w-0 max-w-32 bg-transparent text-right text-sm text-white"
      >
        {config.i18n.locales.map(locale => <option key={locale.code} value={locale.code} className="text-black">{locale.label}</option>)}
      </select>
    </label> : undefined;
  const renderPageLink = (page: NavigationPage, className: string, active: boolean, children: ComponentChildren) =>
    <Link href={page.href} aria-current={active ? 'page' : undefined} className={className}>{children}</Link>;

  return <DocsNavigationView groups={groups} activeHref={effectivePath} renderPageLink={renderPageLink}
    versionLabel={versionLabel} versionSelect={versionSelect} languageSelect={languageSelect} />;
}
