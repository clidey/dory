import classNames from "classnames";
import { Link } from "wouter-preact";
import { ALL_NAVIGATION, type Navigation } from "../components/store";
import { usePathname } from "../components/hooks";

type PageEntry = { title: string; href: string; group: string };

function PageCard({ page, dir, className }: { page: PageEntry; dir: 'previous' | 'next'; className?: string }) {
  return (
    <Link
      href={page.href}
      className={classNames('dory-pager-card', className, { 'text-right': dir === 'next' })}
    >
      <span className="dory-pager-label">
        {dir === 'previous' ? `← ${page.group}` : `${page.group} →`}
      </span>
      <span className="dory-pager-title">{page.title}</span>
    </Link>
  );
}

/**
 * Previous/next page cards in navigation order. Pass `navigation` when
 * rendering on the server, where store titles are not yet loaded.
 */
export function PrevNextLinks({ navigation = ALL_NAVIGATION }: { navigation?: Navigation[] }) {
  const pathname = usePathname();
  const pages: PageEntry[] = navigation.flatMap(tab =>
    tab.groups.flatMap(group =>
      group.pages.map(page => ({ title: page.title, href: page.href, group: group.title }))
    )
  );
  const index = pages.findIndex(page => page.href === pathname);
  const previousPage = index > 0 ? pages[index - 1] : null;
  const nextPage = index > -1 ? pages[index + 1] : null;

  if (!nextPage && !previousPage) {
    return null;
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {previousPage && <PageCard dir="previous" page={previousPage} />}
      {nextPage && <PageCard dir="next" page={nextPage} className={classNames({ 'sm:col-span-2': !previousPage })} />}
    </div>
  );
}
