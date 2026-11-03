import classNames from 'classnames';
import { Link } from 'wouter-preact';

export type PageEntry = { title: string; href: string; group: string };

function PageCard({ page, dir, className, onNavigate }: { page: PageEntry; dir: 'previous' | 'next'; className?: string; onNavigate?: (href: string) => void }) {
  const contents = <>
    <span className="dory-pager-label">{dir === 'previous' ? `← ${page.group}` : `${page.group} →`}</span>
    <span className="dory-pager-title">{page.title}</span>
  </>;
  const classes = classNames('dory-pager-card', className, { 'text-right': dir === 'next' });
  return onNavigate
    ? <a href="#" className={classes} onClick={event => { event.preventDefault(); onNavigate(page.href); }}>{contents}</a>
    : <Link href={page.href} className={classes}>{contents}</Link>;
}

/** Navigation cards shared by the built site and the app-owned runtime. */
export function PrevNextLinksView({ pages, pathname, onNavigate }: { pages: PageEntry[]; pathname: string; onNavigate?: (href: string) => void }) {
  const index = pages.findIndex(page => page.href === pathname);
  const previousPage = index > 0 ? pages[index - 1] : null;
  const nextPage = index > -1 ? pages[index + 1] : null;
  if (!nextPage && !previousPage) return null;
  return <div className="mt-6 grid gap-4 sm:grid-cols-2">
    {previousPage && <PageCard dir="previous" page={previousPage} onNavigate={onNavigate} />}
    {nextPage && <PageCard dir="next" page={nextPage} onNavigate={onNavigate} className={classNames({ 'sm:col-span-2': !previousPage })} />}
  </div>;
}
