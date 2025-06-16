import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { Link } from 'wouter-preact';
import { usePathname } from 'wouter-preact/use-browser-location';
import docsConfig from '../../docs/dory.json';
import { DarkModeToggle } from '../components/dark-mode-toggle';
import { MobileSearch, Search } from '../components/search';
import { ALL_NAVIGATION } from '../components/store';
import { MobileNavigation } from './mobile-navigation';

function TopLevelNavItem({ href, children, isActive }: { href: string; children: string; isActive?: boolean }) {
  return (
    <li>
      <Link
        to={href}
        className={classNames(
          "text-sm/5 transition",
          isActive 
            ? "text-sky-500" 
            : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
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

  const { light, dark } = useMemo(() => {
    return { light: docsConfig.logo.light, dark: docsConfig.logo.dark };
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
      <div className="relative flex justify-between gap-6 sm:gap-8 md:grow items-center w-full">
        <div className="flex items-center grow gap-4 lg:gap-6">
          <img src={`/${light}`} alt="logo" className="w-10 h-10 hidden dark:block rounded-full" />
          <img src={`/${dark}`} alt="logo" className="w-10 h-10 block dark:hidden rounded-full" />
          <h1 className="text-base lg:text-2xl font-bold">{docsConfig.name}</h1>
        </div>
        <nav className="hidden md:block">
          <ul role="list" className="flex items-center gap-8">
            {ALL_NAVIGATION.map((tab) => (
              <TopLevelNavItem 
                key={tab.title} 
                href={tab.groups[0].pages[0].href}
                isActive={pathname.startsWith(`/${tab.groups[0].pages[0].href.split('/')[1]}`)}
              >
                {tab.title}
              </TopLevelNavItem>
            ))}
          </ul>
        </nav>
        <div className="hidden md:block md:h-5 md:w-px md:bg-zinc-900/10 md:dark:bg-white/15" />
        <div className="flex items-center gap-3">
          <MobileSearch />
          <Search />
          <DarkModeToggle />
          <MobileNavigation />
        </div>
      </div>
    </header>
  );
}