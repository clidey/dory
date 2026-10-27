import classNames from 'classnames';
import { ChevronsUpDown } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'preact/hooks';
import { Link } from 'wouter-preact';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { DoryMark } from '../ui/dory-mark';
import { usePathname } from './hooks';
import { ALL_NAVIGATION, completeFrontMatter } from './store';

const config = docsConfig as DoryConfig;

type Frontmatter = Record<string, any>;

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

/**
 * Dark sidebar: version card, every navigation group numbered in order, and a
 * "Built with Dory" footer. Pass `frontmatter` when rendering on the server;
 * the client reads the loaded frontmatter store.
 */
export function Navigation({ frontmatter = completeFrontMatter }: { frontmatter?: Frontmatter[] }) {
    const pathname = usePathname();

    const effectivePath = pathname === '/'
        ? ALL_NAVIGATION[0]?.groups[0]?.pages[0]?.href ?? '/'
        : pathname;

    // Long sidebars scroll; bring the active page into view on load and on navigation.
    const navRef = useRef<HTMLElement>(null);
    useEffect(() => {
        navRef.current?.querySelector('a[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    }, [effectivePath]);

    // The top bar's tabs are section shortcuts; the sidebar always lists every group.
    const groups = useMemo(() => ALL_NAVIGATION.flatMap(tab => tab.groups), []);

    return (
        <nav ref={navRef} className="dory-sidebar flex min-h-full flex-col gap-6 text-[13px]" aria-label="Documentation">
            {config.version && (
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
                    <div>
                        <p className="dory-mono-label">Version</p>
                        <p className="mt-0.5 text-sm font-semibold text-white">{config.version}</p>
                    </div>
                    <ChevronsUpDown aria-hidden="true" className="h-3.5 w-3.5 text-white/50" />
                </div>
            )}

            {groups.map((group, index) => (
                <section key={group.title}>
                    <h3 className="dory-mono-label flex gap-2 px-2.5 !text-[var(--sidebar-primary)]">
                        <span>{String(index + 1).padStart(2, '0')}</span>
                        <span className="text-white/55">{group.title}</span>
                    </h3>
                    <ul role="list" className="mt-2 space-y-0.5">
                        {group.pages.map((page) => {
                            const { method, title } = pageLabel(page.href, page.title, frontmatter);
                            const isActive = effectivePath === page.href;
                            return (
                                <li key={page.href}>
                                    <Link
                                        href={page.href}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={classNames('dory-sidebar-link', { active: isActive })}
                                    >
                                        {method && <span className={classNames('dory-method', methodTone[method] ?? 'text-white/60')}>{method}</span>}
                                        <span className="truncate">{title}</span>
                                        {page.badge && <span className="dory-badge">{page.badge}</span>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}

            <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 px-2.5 pt-4">
                <DoryMark className="h-4 w-4" />
                <span className="dory-mono-label">Built with Dory</span>
            </div>
        </nav>
    );
}
