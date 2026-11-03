import { completeFrontMatter, getNavigationForPath, type Navigation } from "../components/store";
import { usePathname } from "../components/hooks";
import { PrevNextLinksView, type PageEntry } from './prev-next-view';

/**
 * Previous/next page cards in navigation order. Pass `navigation` when
 * rendering on the server, where store titles are not yet loaded.
 */
export function PrevNextLinks({ navigation }: { navigation?: Navigation[] }) {
  const pathname = usePathname();
  const pages: PageEntry[] = (navigation ?? getNavigationForPath(pathname)).flatMap(tab =>
    tab.groups.flatMap(group =>
      group.pages.map(page => ({
        title: completeFrontMatter.find(entry => entry.path === page.href)?.title ?? page.title,
        href: page.href,
        group: group.title,
      }))
    )
  );
  return <PrevNextLinksView pages={pages} pathname={pathname} />;
}
