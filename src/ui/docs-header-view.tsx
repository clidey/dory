import type { ComponentChildren } from 'preact';
import { Badge } from '@clidey/ux';

export type HeaderTab = { title: string; href: string; active: boolean };

type LinkRenderer = (href: string, className: string, children: ComponentChildren) => ComponentChildren;

/** The top bar shared by static Dory sites and runtime-loaded documentation. */
export function DocsHeaderView({ name, logo, homeHref, tabs, renderLink, actions, docsLabel = 'Docs', sectionsLabel = 'Sections', homeClassName, embedded = false }: {
  name: string;
  logo?: string;
  homeHref: string;
  tabs: HeaderTab[];
  renderLink: LinkRenderer;
  actions?: ComponentChildren;
  docsLabel?: string;
  sectionsLabel?: string;
  homeClassName?: string;
  embedded?: boolean;
}) {
  return <header className="dory-topbar sticky top-0 z-50 flex h-14 shrink-0 items-stretch bg-[var(--sidebar)] text-white">
    {renderLink(homeHref, homeClassName ?? 'flex w-60 shrink-0 items-center gap-2.5 px-4', <>
      {logo && <img data-testid={embedded ? 'embedded-logo' : undefined} src={logo} alt="" className="h-7 w-7" />}
      <span data-testid={embedded ? 'embedded-site-name' : undefined} className="font-heading text-lg font-bold tracking-tight text-white">{name}</span>
      <Badge variant="outline" className="dory-docs-pill">{docsLabel}</Badge>
    </>)}
    <nav className="hidden md:flex items-stretch" aria-label={sectionsLabel}>
      {tabs.map(tab => renderLink(tab.href, `dory-topbar-tab${tab.active ? ' active' : ''}`, tab.title))}
    </nav>
    <div className="ml-auto flex items-center gap-3 pr-4" data-testid="header-actions">{actions}</div>
  </header>;
}
