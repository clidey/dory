import classNames from 'classnames';
import { useMemo } from 'preact/hooks';
import { Link } from 'wouter-preact';
import { usePathname } from '../components/hooks';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { MobileSearch, Search } from '../components/search';
import { ALL_NAVIGATION } from '../components/store';
import { MobileNavigation } from './mobile-navigation';
import { ModeToggle } from '@clidey/ux';
import { useIsEmbedded } from '../components/hooks';
import { assetUrl } from '../utils/base-path';

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
  const isEmbedded = useIsEmbedded();
  const logo = useMemo(() => assetUrl(config.logo.light), []);

  return (
    <header className="dory-topbar sticky top-0 z-50 flex h-14 shrink-0 items-stretch bg-[var(--sidebar)] text-white">
      <Link href={ALL_NAVIGATION[0]?.groups[0]?.pages[0]?.href ?? '/'} className="flex w-60 shrink-0 items-center gap-2.5 px-4">
        <img src={logo} alt="" className="h-7 w-7" />
        <span className="font-heading text-lg font-bold tracking-tight text-white">{config.name}</span>
        <span className="dory-docs-pill">Docs</span>
      </Link>
      <nav className="hidden md:flex items-stretch" aria-label="Sections">
        {ALL_NAVIGATION.map((tab) => {
          const isActive = tab.groups.some(group => group.pages.some(page => page.href === pathname));
          return (
            <Link
              key={tab.title}
              href={tab.groups[0].pages[0].href}
              className={classNames('dory-topbar-tab', { active: isActive })}
            >
              {tab.title}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3 pr-4" data-testid="header-actions">
        {!ssr && (
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
      </div>
    </header>
  );
}
