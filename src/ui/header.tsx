import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Link } from 'wouter-preact';
import { usePathname } from '../components/hooks';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { MobileSearch, Search } from '../components/search';
import { ALL_NAVIGATION } from '../components/store';
import { MobileNavigation } from './mobile-navigation';
import { ModeToggle } from '@clidey/ux';
import { useIsEmbedded } from '../components/hooks';

const config = docsConfig as DoryConfig;

function TopLevelNavItem({ href, children, isActive }: { href: string; children: string; isActive?: boolean }) {
  return (
    <li>
      <Link
        to={href}
        className={classNames(
          "text-xs transition hover:opacity-80",
          {
            "text-brand-foreground": isActive,
          },
        )}
      >
        {children}
      </Link>
    </li>
  );
}

export function Header({ className }: { className?: string }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const isEmbedded = useIsEmbedded();

  const { light, dark } = useMemo(() => {
    return { light: config.logo.light, dark: config.logo.dark };
  }, []);

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 0);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
    }
  }, []);

  return (
    <header
      className={classNames(
        'sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between bg-white px-4 py-5 shadow-md shadow-gray-900/5 sm:px-6 lg:px-8 dark:shadow-none',
        className,
        {
          'dark:bg-gray-900/95 dark:backdrop-blur-sm dark:[@supports(backdrop-filter:blur(0))]:bg-neutral-900/75': isScrolled,
          'dark:bg-transparent': !isScrolled,
        },
      )}
    >
      <div className="relative flex justify-between gap-6 sm:gap-8 md:grow items-center w-full px-4">
        <div className="flex items-center grow gap-2">
          <img src={`/${light}`} alt="logo" className="w-8 hidden dark:block" />
          <img src={`/${dark}`} alt="logo" className="w-8 block dark:hidden" />
          <h1 className="text-base lg:text-2xl font-bold">{config.name}</h1>
        </div>
        <nav className="hidden md:block">
          <ul role="list" className="flex items-center gap-8">
            {ALL_NAVIGATION.map((tab) => {
              const isActive = tab.groups.some(group =>
                group.pages.some(page => page.href === pathname)
              );
              return (
                <TopLevelNavItem
                  key={tab.title}
                  href={tab.groups[0].pages[0].href}
                  isActive={isActive}
                >
                  {tab.title}
                </TopLevelNavItem>
              );
            })}
          </ul>
        </nav>
        <div className="hidden md:block md:h-5 md:w-px md:bg-zinc-900/10 md:dark:bg-white/15" />
        <div className="flex items-center gap-3" data-testid="header-actions">
          <MobileSearch />
          <Search />
          {
            !isEmbedded &&
            <ModeToggle data-testid="mode-toggle" />
          }
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}