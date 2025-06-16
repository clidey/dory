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
export { APIPlayground } from './api-playground';

export const wrapper = ({ children }: { children: preact.ComponentChildren }) => {
  return <div className="flex flex-col w-full">{children}</div>;
};

export const hr = () => <hr className="my-4 text-gray-500/25 dark:text-gray-200/25" />;