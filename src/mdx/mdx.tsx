import { useEffect, useRef } from 'preact/hooks';
import { lazy, Suspense } from 'preact/compat';
import { usePathname } from 'wouter-preact/use-browser-location';
import { completeFrontMatter } from '../components/store';
import { Loading } from '../components/loading';

export { h1, h2, h3, h4, h5, h6, p, Row, Col, Anchor as a, Image as img } from './text';
export { Code as code, CodeGroup } from './code';
export * from './tag';
export { Pre as pre } from './fence';
export { Accordion, AccordionGroup } from './accordion';
export { Icon } from './icon';
export { Card, CardGroup } from './card';
export { Callout, Note, Warning, Info, Tip, Check } from './callout';
export { Latex } from './latex';
export { API } from './api';
export { Expandable } from './expandable';
export { ResponseField, Properties, Property } from './open-api';
export { Steps, Step } from './step';
export { Table as table, Th as th, Td as td } from './table';
export { UnorderedList as ul, OrderedList as ol, ListItem as li } from './list';
export { AsyncAPI } from './async-api';
export { Source } from './source';

// Lazy-loaded heavy components — only downloaded when a page uses them
const LazyAPIPlayground = lazy(() => import('./api-playground').then(m => ({ default: m.APIPlayground })));
export const APIPlayground = (props: any) => (
  <Suspense fallback={<Loading />}>
    <LazyAPIPlayground {...props} />
  </Suspense>
);

const LazyWebSocketPlayground = lazy(() => import('./websocket-playground').then(m => ({ default: m.WebSocketPlayground })));
export const WebSocketPlayground = (props: any) => (
  <Suspense fallback={<Loading />}>
    <LazyWebSocketPlayground {...props} />
  </Suspense>
);

export const wrapper = ({ children }: { children: preact.ComponentChildren }) => {
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) {
      // Hide the first h1 if it matches the title
      // This is to avoid having the same title twice in the navigation
      const title = completeFrontMatter.find(fm => fm.path === pathname)?.title;
      const h1 = ref.current.querySelector('h1') as HTMLHeadingElement;
      if (h1) {
        h1.hidden = title === h1.innerText;
      }
    }
  }, [pathname]);

  return <div className="flex flex-col w-full" ref={ref}>{children}</div>;
};


export const hr = () => <hr className="my-4 text-gray-500/25 dark:text-gray-200/25" />;

export const br = () => <br />;