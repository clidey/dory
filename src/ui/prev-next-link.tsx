import { ArrowRightIcon } from "@heroicons/react/24/outline";
import classNames from "classnames";
import { ALL_NAVIGATION } from "../components/store";
import { usePathname } from "../components/hooks";

function PageLink({
  title,
  href,
  dir = 'next',
  ...props
}: Omit<React.ComponentPropsWithoutRef<'div'>, 'dir' | 'title'> & {
  title: string
  href: string
  dir?: 'previous' | 'next'
}) {
  return (
    <div {...props}>
      <p className="font-display text-sm font-medium">
        {dir === 'next' ? 'Next' : 'Previous'}
      </p>
      <div className="mt-1">
        <a href={href} className={classNames('flex items-center gap-x-1 text-base font-semibold hover:opacity-80', {
            'flex-row-reverse': dir === 'previous',
          },
        )}>
          <p className={classNames("flex items-center gap-x-1 text-base font-semibold hover:opacity-80", {
            "flex-row-reverse": dir === "previous"
          })}>
            {title}
            <ArrowRightIcon
              className={classNames(
                'h-4 w-4 flex-none fill-current',
                {
                  'rotate-180': dir === 'previous',
                },
              )}
            />
          </p>
        </a>
      </div>
    </div>
  )
}
export function PrevNextLinks() {
  const pathname = usePathname();
  const allLinks = ALL_NAVIGATION.flatMap(tab => 
    tab.groups.flatMap(group => 
      group.pages.map(page => page.href)
    )
  );
  const linkIndex = allLinks.findIndex(link => link === pathname);
  const previousPage = linkIndex > -1 ? allLinks[linkIndex - 1] : null;
  const nextPage = linkIndex > -1 ? allLinks[linkIndex + 1] : null;

  const previousPageTitle = previousPage ? ALL_NAVIGATION
    .flatMap(tab => tab.groups)
    .flatMap(group => group.pages)
    .find(page => page.href === previousPage)?.title : null;
  const nextPageTitle = nextPage ? ALL_NAVIGATION
    .flatMap(tab => tab.groups)
    .flatMap(group => group.pages)
    .find(page => page.href === nextPage)?.title : null;

  if (!nextPage && !previousPage) {
    return null;
  }

  return (
    <div className="mt-12 pt-6 flex border-t border-black/20 dark:border-white/20">
      {previousPage && <PageLink dir="previous" title={previousPageTitle ?? ''} href={previousPage} />}
      {nextPage && <PageLink className="ml-auto text-right" title={nextPageTitle ?? ''} href={nextPage} />}
    </div>
  )
}
