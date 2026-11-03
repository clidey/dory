import classNames from 'classnames';
import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Badge } from '@clidey/ux';
import { DORY_REPO_URL, DoryMark } from './dory-mark';

export type NavigationPage = { href: string; title: string; badge?: string; method?: string };
export type NavigationGroup = { title: string; pages: NavigationPage[] };

const methodTone: Record<string, string> = {
  GET: 'text-[var(--sidebar-primary)]',
  POST: 'text-[var(--highlight)]',
  PUT: 'text-[#f4781c]',
  PATCH: 'text-[#f4781c]',
  DEL: 'text-[#ff6668]',
  PUB: 'text-[#f4781c]',
  SUB: 'text-[var(--sidebar-primary)]',
  WS: 'text-[var(--sidebar-primary)]',
};

type PageLinkRenderer = (page: NavigationPage, className: string, active: boolean, children: ComponentChildren) => ComponentChildren;

/** The navigation tree shared by static Dory sites and runtime-loaded documentation. */
export function DocsNavigationView({ groups, activeHref, renderPageLink, versionLabel, versionSelect, languageSelect, ariaLabel = 'Documentation', versionCaption = 'Version', footerLabel = 'Built with Dory' }: {
  groups: NavigationGroup[];
  activeHref: string;
  renderPageLink: PageLinkRenderer;
  versionLabel?: string;
  versionSelect?: ComponentChildren;
  languageSelect?: ComponentChildren;
  ariaLabel?: string;
  versionCaption?: string;
  footerLabel?: string;
}) {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const container = nav?.parentElement;
    const active = nav?.querySelector('a[aria-current="page"], button[aria-current="page"]');
    if (!container || !active) return;
    const item = active.getBoundingClientRect();
    const viewport = container.getBoundingClientRect();
    if (item.top < viewport.top) container.scrollTop += item.top - viewport.top;
    else if (item.bottom > viewport.bottom) container.scrollTop += item.bottom - viewport.bottom;
  }, [activeHref]);

  return <nav ref={navRef} className="dory-sidebar flex min-h-full flex-col gap-6 text-[13px]" aria-label={ariaLabel}>
    {versionLabel && <div className="relative flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
      <div><p className="dory-mono-label">{versionCaption}</p><p className="mt-0.5 text-sm font-semibold text-white">{versionLabel}</p></div>
      {versionSelect}
    </div>}
    {languageSelect}
    {groups.map((group, index) => <section key={`${group.title}-${index}`}>
      <h3 className="dory-mono-label flex gap-2 px-2.5 !text-[var(--sidebar-primary)]">
        <span>{String(index + 1).padStart(2, '0')}</span><span className="text-white/55">{group.title}</span>
      </h3>
      <ul role="list" className="mt-2 space-y-0.5">{group.pages.map(page => {
        const isActive = activeHref === page.href;
        const contents = <>
          {page.method && <span className={classNames('dory-method', methodTone[page.method] ?? 'text-white/60')}>{page.method}</span>}
          <span className="truncate">{page.title}</span>
          {page.badge && <Badge variant="secondary" className="dory-badge">{page.badge}</Badge>}
        </>;
        return <li key={page.href}>{renderPageLink(page, classNames('dory-sidebar-link', { active: isActive }), isActive, contents)}</li>;
      })}</ul>
    </section>)}
    <a href={DORY_REPO_URL} target="_blank" rel="noopener noreferrer" className="dory-sidebar-footer mt-auto flex items-center gap-2.5 border-t border-white/10 px-2.5 pt-4"><DoryMark className="h-4 w-4" /><span className="dory-mono-label">{footerLabel}</span></a>
  </nav>;
}
