import classNames from 'classnames';
import { useMemo } from 'preact/hooks';
import { usePathname } from './hooks';
import { ALL_NAVIGATION } from './store';
import { Link } from 'wouter-preact';

export function Navigation() {
    const pathname = usePathname();

    const effectivePath = pathname === '/' 
        ? ALL_NAVIGATION[0]?.groups[0]?.pages[0]?.href ?? '/' 
        : pathname;

    const currentTab = useMemo(() => {
        return ALL_NAVIGATION.find(tab => 
            tab.groups.some(group => 
                group.pages.some(page => page.href === effectivePath)
            )
        );
    }, [effectivePath]);

    return (
        <nav className="docucod-navigation text-base lg:text-sm">
            <ul role="list" className="space-y-9">
                {currentTab && (
                <li key={currentTab.title}>
                    <h2 className="font-display font-medium text-slate-900 dark:text-white">{currentTab.title}</h2>
                    {currentTab.groups.map(group => (
                        <div key={group.title}>
                            <h3 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{group.title}</h3>
                            <ul role="list" className="mt-2 space-y-2 border-l-2 border-slate-100 lg:mt-4 lg:space-y-4 lg:border-slate-200 dark:border-slate-800">
                                {group.pages.map((page) => {
                                    const isActive = effectivePath === page.href;
                                    return (
                                        <li key={page.href} className="relative">
                                            <Link to={page.href} className={classNames(
                                                'block w-full pl-3.5 before:pointer-events-none before:absolute before:top-1/2 before:-left-1 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full',
                                                {
                                                    'font-semibold text-sky-500 before:bg-sky-500': isActive,
                                                    'text-slate-500 before:hidden before:bg-slate-300 hover:text-slate-600 hover:before:block dark:text-slate-400 dark:before:bg-slate-700 dark:hover:text-slate-300': !isActive
                                                },
                                            )}>
                                                {page.title}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </li>
                )}
            </ul>
        </nav>
    );
}
