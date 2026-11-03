import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { Link } from 'wouter-preact';
import { usePathname } from '../components/hooks';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { MobileSearch, Search } from '../components/search';
import { getNavigationForPath } from '../components/store';
import { MobileNavigation } from './mobile-navigation';
import { ModeToggle } from '@clidey/ux';
import { useIsEmbedded } from '../components/hooks';
import { assetUrl } from '../utils/base-path';
import { DocsHeaderView } from './docs-header-view';

const config = docsConfig as DoryConfig;
const isThemeForced = config.theme?.mode === 'dark' || config.theme?.mode === 'light';

/**
 * Dark top bar: logo and site name with a DOCS pill, one underlined tab per
 * navigation tab, search with a ⌘K hint, theme toggle and the mobile menu.
 * With `ssr` the client-only widgets (search, toggle, menu) are left out and
 * mount during hydration.
 */
export function Header({ ssr = false }: { ssr?: boolean }) {
  const pathname = usePathname();
  const navigation = getNavigationForPath(pathname);
  const isEmbedded = useIsEmbedded();
  const logo = useMemo(() => config.logo?.light ? assetUrl(config.logo.light) : '', []);
  const renderLink = (href: string, className: string, children: ComponentChildren) =>
    <Link key={href} href={href} className={className}>{children}</Link>;

  return (
    <DocsHeaderView name={config.name} logo={logo} homeHref={navigation[0]?.groups[0]?.pages[0]?.href ?? '/'}
      tabs={navigation.map(tab => ({ title: tab.title, href: tab.groups[0].pages[0].href, active: tab.groups.some(group => group.pages.some(page => page.href === pathname)) }))}
      renderLink={renderLink}
      actions={!ssr && (
          <>
            <div className="dory-topbar-search relative hidden lg:block">
              <Search />
              <kbd className="dory-kbd" aria-hidden="true">⌘K</kbd>
            </div>
            <div className="lg:hidden [&_[data-slot=search-input-wrapper]]:w-9 [&_[data-slot=search-input-wrapper]]:border-transparent [&_[data-slot=search-input-wrapper]]:bg-white/8 [&_[data-slot=search-input-wrapper]]:px-2.5 [&_svg]:mr-0 [&_svg]:text-white/70 [&_input]:hidden">
              <MobileSearch />
            </div>
            {!isEmbedded && !isThemeForced && (
              <span className="dory-mode"><ModeToggle data-testid="mode-toggle" /></span>
            )}
            <MobileNavigation />
          </>
        )}
    />
  );
}
