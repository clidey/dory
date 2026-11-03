import { render, type ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { evaluate } from '@mdx-js/mdx';
import * as jsxRuntime from 'preact/jsx-runtime';
import { preprocessMdxSource } from '../mdx/preprocess';
import { getCommonMdxConfig } from '../config/mdx-common';
import { h1, h2, h3, h4, h5, h6, p, Row, Col, Anchor, Image } from '../mdx/text';
import { Code, CodeGroup } from '../mdx/code';
import { Pre } from '../mdx/fence';
import { Latex } from '../mdx/latex';
import { Accordion, AccordionGroup } from '../mdx/accordion';
import { Icon } from '../mdx/icon';
import { Card, CardGroup } from '../mdx/card';
import { Callout, Note, Warning, Info, Tip, Check } from '../mdx/callout';
import { Expandable } from '../mdx/expandable';
import { Steps, Step } from '../mdx/step';
import { Table, Th, Td } from '../mdx/table';
import { UnorderedList, OrderedList, ListItem } from '../mdx/list';
import { Tag } from '../mdx/tag';
import { Chip, ChipGroup } from '../mdx/chip';
import { Tabs, Tab } from '../mdx/tabs';
import { TypeScale } from '../mdx/type-scale';
import { API } from '../mdx/api';
import { Properties, Property, ResponseField } from '../mdx/open-api';
import { Specimen, SpecimenProps, Prop } from '../mdx/specimen';
import { IconGrid } from '../mdx/icon-grid';

import { CatalogIcon, Button, Sheet, SheetContent } from '@clidey/ux';
import { Breadcrumb } from '../ui/breadcrumb';
import { ChatAssistant, useChatAssistant, type ChatTransport, type Message } from '../components/chat-assistant';
import { createSearchIndex } from '../components/search-index';
import { stripMdxToText } from '../utils/search-content';
import { PageActionsView } from '../ui/page-actions';
import { PageFooterView } from '../ui/page-footer';
import { DocsPageFrame } from '../ui/docs-page-frame';
import { DocsHeaderView } from '../ui/docs-header-view';
import { DocsNavigationView } from '../ui/docs-navigation-view';
import { PrevNextLinksView } from '../ui/prev-next-view';
import { PageFeedbackView } from '../ui/page-feedback';
import { PageMeta } from '../ui/page-meta';
import { TableOfContentsView } from '../ui/table-of-content-view';
import '@clidey/ux/theme-fonts.css';
import { applyEmbeddedConfig, parseEmbeddedConfig, type EmbeddedConfig } from './config';
import '@clidey/ux/styles.css';
import '@clidey/ux/brand.css';
import '../app.css';
import '../theme.scss';

type DocFile = { path: string; content: string };
type DocManifestEntry = { path: string; title?: string };
type ChatTurn = { role: 'user' | 'assistant'; content: string };
type ChatCitation = { path: string; title: string; excerpt?: string };
type Labels = {
  documentation: string;
  docsBadge: string;
  version: string;
  sections: string;
  onThisPage: string;
  searchPages: string;
  findPage: string;
  choosePage: string;
  rendering: string;
  waiting: string;
  unsupported: string;
  noPages: string;
  invalidPage: string;
  tooLarge: string;
  renderFailed: string;
  askDory: string;
  chatGrounded: string;
  chatIntro: string;
  chatQuestion: string;
  chatFollowUp: string;
  chatSend: string;
  chatLoading: string;
  chatError: string;
  chatNew: string;
  chatSources: string;
  chatSearch: string;
  chatClose: string;
};
type LoadMessage = { __dory_docs: true; type: 'load'; files?: DocFile[]; manifest?: DocManifestEntry[]; path: string; theme?: 'light' | 'dark'; locale?: string; labels?: Partial<Labels>; config?: EmbeddedConfig; chatEnabled?: boolean };
type FileMessage = { __dory_docs: true; type: 'file'; path: string; requestId: string; content: string };
type ChatResultMessage = { __dory_docs: true; type: 'chat-result'; requestId: string; answer?: string; citations?: ChatCitation[]; followUps?: string[]; error?: string };
type MdxModule = { default: (props: { components: typeof components }) => ComponentChildren };

const root = (() => {
  const element = document.getElementById('dory-root');
  if (!element) throw new Error('Dory runtime root is missing');
  return element;
})();
const filePath = /^docs\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.mdx$/;
let files = new Map<string, string>();
let manifest = new Map<string, string>();
const pendingReads = new Map<string, { path: string; resolve: (content: string) => void; reject: (error: Error) => void; timeout: number }>();
const pendingChats = new Map<string, { resolve: (result: ChatResultMessage) => void; reject: (error: Error) => void; timeout: number }>();
let nextRequestId = 0;
let version = 0;
let activePath = '';
let activeDocsRoot = 'docs/';
let site: EmbeddedConfig = {};
let activeLocale = 'en_US';
let activeTheme: 'light' | 'dark' = 'dark';
let chatEnabled = false;
let chatMessages: Message[] = [];
let chatScope = '';
let embeddedSearchIndex = createSearchIndex();
let searchIndexPromise: Promise<void> | null = null;
let searchIndexEpoch = 0;
const defaultLabels: Labels = {
  documentation: 'Documentation',
  docsBadge: 'Docs',
  version: 'Version',
  sections: 'Sections',
  onThisPage: 'On this page',
  searchPages: 'Search documentation',
  findPage: 'Find a page',
  choosePage: 'Choose documentation page',
  rendering: 'Rendering documentation…',
  waiting: 'Waiting for documentation…',
  unsupported: 'This interactive component is unavailable in the embedded viewer.',
  noPages: 'No valid documentation pages were provided.',
  invalidPage: 'A documentation page has an invalid path or exceeds 1 MB.',
  tooLarge: 'Documentation exceeds the 10 MB limit.',
  renderFailed: 'Could not render this page',
  askDory: 'Ask Dory',
  chatGrounded: 'Grounded in these docs',
  chatIntro: 'Find answers in these docs. Open cited pages for full context.',
  chatQuestion: 'Your documentation question',
  chatFollowUp: 'Ask a follow-up',
  chatSend: 'Send question',
  chatLoading: 'Reading the docs and checking sources…',
  chatError: 'The answer is unavailable right now.',
  chatNew: 'New',
  chatSources: 'Sources',
  chatSearch: 'Search',
  chatClose: 'Close Ask Dory',
};
let labels = defaultLabels;

const send = (type: 'ready' | 'navigate' | 'external' | 'error', details: Record<string, string> = {}) => {
  window.parent.postMessage({ __dory_docs: true, type, ...details }, '*');
};

function readPage(path: string): Promise<string> {
  const cached = files.get(path);
  if (cached !== undefined) return Promise.resolve(cached);
  if (!manifest.has(path)) return Promise.reject(new Error(labels.invalidPage));
  const requestId = String(++nextRequestId);
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingReads.delete(requestId);
      reject(new Error(labels.renderFailed));
    }, 10_000);
    pendingReads.set(requestId, { path, resolve, reject, timeout });
    window.parent.postMessage({ __dory_docs: true, type: 'read', path, requestId }, '*');
  });
}

function ensureEmbeddedSearchIndex(): Promise<void> {
  if (searchIndexPromise) return searchIndexPromise;
  const epoch = searchIndexEpoch;
  const index = embeddedSearchIndex;
  const pages = [...manifest.entries()].filter(([path]) => path.startsWith(activeDocsRoot)).slice(0, 1000);
  searchIndexPromise = (async () => {
    let bytes = 0;
    for (const [path, title] of pages) {
      if (epoch !== searchIndexEpoch) return;
      try {
        const content = await readPage(path);
        bytes += content.length;
        if (bytes > 10_000_000) return;
        const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
        await index.add(path, { title }, `${title}\n${stripMdxToText(body)}`);
      } catch {
        // One unavailable page must not prevent searching the remaining docs.
      }
    }
  })();
  return searchIndexPromise;
}

function askHost(message: string, history: ChatTurn[]): Promise<ChatResultMessage> {
  const requestId = String(++nextRequestId);
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      pendingChats.delete(requestId);
      reject(new Error(labels.chatError));
    }, 45_000);
    pendingChats.set(requestId, { resolve, reject, timeout });
    window.parent.postMessage({ __dory_docs: true, type: 'chat', requestId, message, history, path: activePath, locale: activeLocale }, '*');
  });
}

const unsupported = ({ children }: { children?: ComponentChildren }) => <div className="my-4 rounded-lg border border-[var(--border)] bg-muted p-4 text-sm text-muted-foreground">{labels.unsupported}{children}</div>;
const components = {
  h1, h2, h3, h4, h5, h6, p, a: Anchor, img: Image,
  code: Code, pre: Pre, table: Table, th: Th, td: Td,
  ul: UnorderedList, ol: OrderedList, li: ListItem,
  Row, Col, CodeGroup, Accordion, AccordionGroup, Icon, Card, CardGroup,
  Callout, Note, Warning, Info, Tip, Check, Expandable,
  Steps, Step, Table, Th, Td, UnorderedList, OrderedList, ListItem,
  Tag, Chip, ChipGroup, Tabs, Tab, TypeScale, Latex,
  API, Properties, Property, ResponseField, Specimen, SpecimenProps, Prop, IconGrid,
  hr: () => <hr className="my-6 border-0 border-t border-[var(--border)]" />,
  br: () => <br />,
  APIPlayground: unsupported, WebSocketPlayground: unsupported,
  AsyncAPI: unsupported, Source: unsupported,
};

function frontmatterField(content: string, field: string): string | undefined {
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/);
  return frontmatter?.[1].match(new RegExp(`^${field}:\\s*['\"]?(.+?)['\"]?\\s*$`, 'm'))?.[1];
}

function frontmatterMeta(content: string): Record<string, string> | undefined {
  const frontmatter = content.match(/^---\s*\n([\s\S]*?)\n---/)?.[1];
  const block = frontmatter?.match(/^meta:\s*\n((?:[ \t]+[^\n]*\n?)*)/m)?.[1];
  if (!block) return undefined;
  const entries = block.split('\n').flatMap(line => {
    const match = line.match(/^\s{2,}([^:]+):\s*(.+?)\s*$/);
    return match ? [[match[1].trim(), match[2].trim().replace(/^['"]|['"]$/g, '')] as const] : [];
  });
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function titleOf(path: string, content: string): string {
  const title = frontmatterField(content, 'title');
  return title || path.split('/').pop()!.replace(/\.mdx$/, '').replace(/[-_]/g, ' ');
}

type NavPage = { path: string; title: string; badge?: string };
type NavGroup = { title: string; pages: NavPage[] };
type NavTab = { title: string; groups: NavGroup[] };

function navigationTabs(): NavTab[] {
  const localized = site.i18n?.locales?.find(item => item.code.replace('_', '-').toLowerCase() === activeLocale.replace('_', '-').toLowerCase())?.navigation;
  const configured = localized ?? site.navigation;
  if (configured?.tabs?.length) {
    const tabs = configured.tabs.map(tab => ({
      title: tab.tab,
      groups: tab.groups.map(group => ({
        title: group.group,
        pages: group.pages.flatMap(entry => {
          const id = typeof entry === 'string' ? entry : entry.page;
          const path = `${activeDocsRoot}${id}.mdx`;
          const title = manifest.get(path);
          return title === undefined ? [] : [{ path, title, badge: typeof entry === 'string' ? undefined : entry.badge }];
        }),
      })).filter(group => group.pages.length),
    })).filter(tab => tab.groups.length);
    if (tabs.length) return tabs;
  }
  return [{ title: labels.documentation, groups: [{ title: labels.documentation, pages: [...manifest.entries()]
    .filter(([path]) => path.startsWith(activeDocsRoot))
    .map(([path, title]) => ({ path, title }))
    .sort((a, b) => a.path === `${activeDocsRoot}index.mdx` ? -1 : b.path === `${activeDocsRoot}index.mdx` ? 1 : a.title.localeCompare(b.title, document.documentElement.lang)) }] }];
}

function EmbeddedContent({ module, title }: { module: MdxModule; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const Content = module.default;
  useEffect(() => {
    const heading = ref.current?.querySelector('h1');
    if (heading) heading.hidden = heading.innerText === title;
  }, [module, title]);
  return <div className="h-full antialiased"><div className="flex min-h-full"><div ref={ref} className="flex w-full flex-col"><Content components={components} /></div></div></div>;
}

function ChatDialog({ initialQuery, onClose, onSearch }: { initialQuery: string; onClose: () => void; onSearch: () => void }) {
  const transport: ChatTransport = {
    status: async () => true,
    async ask(message, history) {
      const result = await askHost(message, history);
      return {
        answer: result.answer,
        error: result.error,
        followUps: result.followUps,
        citations: result.citations?.map(citation => ({
          id: citation.path,
          title: citation.title,
          url: citation.path,
          excerpt: citation.excerpt ?? '',
        })),
      };
    },
  };
  const chat = useChatAssistant({
    transport,
    initialMessages: chatMessages,
    initialDraft: initialQuery,
    onMessagesChange: next => { chatMessages = next; },
  });
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  const questions = site.chat?.suggestedQuestions?.length ? site.chat.suggestedQuestions : [
    `How do I get started with ${site.name ?? labels.documentation}?`,
    `What can I do with ${site.name ?? labels.documentation}?`,
    'Explain this page',
  ];
  const openCitation = (path: string) => {
    const [pagePath, hash] = path.split('#', 2);
    if (!manifest.has(pagePath)) return;
    onClose();
    void showPage(pagePath).then(() => { if (hash) document.getElementById(hash)?.scrollIntoView(); });
  };

  return <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm sm:py-[10vh]" role="presentation" onClick={onClose}>
    <div className="dory-search-panel mx-auto flex max-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-2xl" role="dialog" aria-modal="true" aria-label={labels.askDory} onClick={event => event.stopPropagation()}>
      <div className="dory-search-tabs flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-5 py-4 sm:px-7">
        <div className="min-w-0 flex-1"><h2 className="text-base font-semibold">{labels.askDory}</h2><p className="text-xs text-muted-foreground">{labels.chatGrounded}</p></div>
        {chat.messages.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={chat.reset}>+ {labels.chatNew}</Button>}
        <Button type="button" variant="ghost" size="sm" onClick={onSearch}>{labels.chatSearch}</Button>
        <Button type="button" variant="ghost" size="sm" aria-label={labels.chatClose} onClick={onClose}><CatalogIcon name="close" className="size-4" /></Button>
      </div>
      <ChatAssistant chat={chat} onNavigate={onClose} onSearch={onSearch}
        siteName={site.name ?? labels.documentation} questions={questions} intro={labels.chatIntro}
        onSourceClick={source => openCitation(source.url)} />
    </div>
  </div>;
}

function EmbeddedSearchDialog({ page, pages, query, setQuery, indexing, onClose, onAsk, onSelect }: {
  page: string;
  pages: NavPage[];
  query: string;
  setQuery: (value: string) => void;
  indexing: boolean;
  onClose: () => void;
  onAsk: () => void;
  onSelect: (path: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);
  useEffect(() => { input.current?.focus(); }, []);
  useEffect(() => { setSelected(0); }, [query]);
  const normalized = query.trim().toLocaleLowerCase();
  const suggestions = normalized ? [] : [
    ...pages.filter(item => item.path === page),
    ...Array.from(document.querySelectorAll<HTMLElement>('.dory-article h2[id]')).map(heading => ({
      path: `${page}#${heading.id}`,
      title: heading.textContent?.replace(/#$/, '').trim() ?? '',
    })),
    ...pages.slice(Math.max(0, pages.findIndex(item => item.path === page)) + 1, Math.max(0, pages.findIndex(item => item.path === page)) + 4),
  ];
  const titleMatches = normalized ? pages.filter(item => item.title.toLocaleLowerCase().includes(normalized)) : [];
  const contentMatches = normalized ? embeddedSearchIndex.search(query, { limit: 8 }).map(item => ({ path: item.url, title: item.title })) : [];
  const results = (normalized ? [...titleMatches, ...contentMatches] : suggestions)
    .filter((item, index, list) => item.title && list.findIndex(candidate => candidate.path === item.path) === index)
    .slice(0, 8);
  const hasAsk = chatEnabled && normalized.length >= 3;
  const optionCount = results.length + Number(hasAsk);
  const choose = (index: number) => {
    if (hasAsk && index === 0) onAsk();
    else {
      const result = results[index - Number(hasAsk)];
      if (result) onSelect(result.path);
    }
  };
  const highlight = (title: string) => {
    const start = normalized ? title.toLocaleLowerCase().indexOf(normalized) : -1;
    if (start < 0) return title;
    return <>{title.slice(0, start)}<mark className="dory-search-highlight">{title.slice(start, start + query.trim().length)}</mark>{title.slice(start + query.trim().length)}</>;
  };

  return <div className="fixed inset-0 z-[65] overflow-y-auto bg-black/50 px-4 py-4 backdrop-blur-sm sm:py-[15vh]" role="presentation" onClick={onClose}>
    <div className="dory-search-panel mx-auto w-full max-w-5xl overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-2xl" role="dialog" aria-modal="true" aria-label={labels.searchPages} onClick={event => event.stopPropagation()}>
      <div className="relative flex h-16 items-center gap-3 px-5 sm:px-7">
        <CatalogIcon name="search" className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input ref={input} className="dory-search-input h-full min-w-0 flex-1 bg-transparent outline-none" value={query} onInput={event => setQuery(event.currentTarget.value)}
          onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); onClose(); }
            else if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(current => optionCount ? (current + 1) % optionCount : 0); }
            else if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(current => optionCount ? (current + optionCount - 1) % optionCount : 0); }
            else if (event.key === 'Enter') { event.preventDefault(); choose(selected); }
            else if (event.key === 'Tab' && !event.shiftKey && chatEnabled) { event.preventDefault(); onAsk(); }
          }}
          placeholder={labels.searchPages} aria-label={labels.searchPages} aria-controls="dory-embedded-search-results" aria-activedescendant={optionCount ? `dory-search-result-${selected}` : undefined} />
        <span className="dory-search-active" aria-current="page">Search</span>
        {chatEnabled && <button type="button" className="dory-search-ask-button" onClick={onAsk}>{labels.askDory}</button>}
      </div>
      <div id="dory-embedded-search-results" className="max-h-[60vh] overflow-y-auto border-t border-[var(--border)]">
        {hasAsk && <button id="dory-search-result-0" type="button" onMouseEnter={() => setSelected(0)} onClick={onAsk} className={`dory-search-result flex w-full items-center gap-4 px-8 py-3 text-left ${selected === 0 ? 'bg-[var(--accent)]' : ''}`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]"><CatalogIcon name="ai" className="size-4" /></span>
          <span><span className="block text-sm font-semibold">{query.trim()}</span><span className="block text-xs text-muted-foreground">{labels.askDory} · {labels.chatGrounded}</span></span>
        </button>}
        {hasAsk && results.length > 0 && <p className="px-8 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pages</p>}
        {results.map((result, index) => <button id={`dory-search-result-${index + Number(hasAsk)}`} key={result.path} type="button" onMouseEnter={() => setSelected(index + Number(hasAsk))} onClick={() => onSelect(result.path)} className={`dory-search-result flex w-full items-center gap-4 px-8 py-3 text-left ${selected === index + Number(hasAsk) ? 'bg-[var(--accent)]' : ''}`}>
          <span className="dory-search-result-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)]"><CatalogIcon name="file" className="size-4" /></span>
          <span className="dory-search-title text-sm">{highlight(result.title)}</span>
        </button>)}
        {normalized && results.length === 0 && !indexing && <p className="p-6 text-center text-sm text-muted-foreground">Nothing found for ‘{query.trim()}’. Please try again.</p>}
        {normalized && indexing && <p role="status" className="px-8 py-3 text-xs text-muted-foreground">Searching documentation…</p>}
      </div>
      <div className="dory-search-footer" aria-hidden="true"><span>↑ ↓ Navigate</span><span>↵ Open</span>{chatEnabled && <span>Tab {labels.askDory}</span>}<span>Esc Close</span></div>
    </div>
  </div>;
}

function Shell({ page, source, module }: { page: string; source: string; module: MdxModule }) {
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [, setSearchRevision] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  useEffect(() => {
    if (!searchOpen) return;
    let active = true;
    setIndexing(true);
    void ensureEmbeddedSearchIndex().finally(() => {
      if (active) { setIndexing(false); setSearchRevision(current => current + 1); }
    });
    return () => { active = false; };
  }, [searchOpen]);
  const [copyMessage, setCopyMessage] = useState('');
  useEffect(() => {
    let clearMessage = 0;
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window.parent || event.data?.__dory_docs !== true || event.data?.type !== 'copied' || event.data?.path !== page) return;
      setCopyMessage(event.data.success === true ? 'Copied to clipboard' : 'Could not copy this page');
      window.clearTimeout(clearMessage);
      clearMessage = window.setTimeout(() => setCopyMessage(''), 3000);
    };
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('message', onMessage); window.clearTimeout(clearMessage); };
  }, [page]);
  const tabs = navigationTabs();
  const allPages = tabs.flatMap(tab => tab.groups.flatMap(group => group.pages));
  const siteName = site.name ?? labels.documentation;
  const logo = activeTheme === 'dark' ? site.logo?.dark ?? site.logo?.light : site.logo?.light ?? site.logo?.dark;
  const title = titleOf(page, source);
  const lead = frontmatterField(source, 'lead');
  const groupTitle = tabs.flatMap(tab => tab.groups).find(group => group.pages.some(item => item.path === page))?.title;
  const headerActions = <>
    <div className="dory-topbar-search relative hidden lg:block">
      <div data-slot="search-input-wrapper" className="flex items-center gap-2 px-3">
        <CatalogIcon name="search" className="h-4 w-4 shrink-0" aria-hidden="true" />
        <input id="dory-topbar-search" data-slot="search-input" readOnly value={search} onClick={() => setSearchOpen(true)} placeholder={labels.searchPages} aria-label={labels.searchPages} className="min-w-0 flex-1 cursor-pointer bg-transparent text-sm outline-none" />
      </div>
      <kbd className="dory-kbd" aria-hidden="true">⌘K</kbd>
    </div>
    {chatEnabled && <Button type="button" variant="outline" size="sm" className="hidden h-9 gap-2 border-white/20 bg-white/5 text-white hover:bg-white/10 lg:flex" onClick={() => setChatOpen(true)}><CatalogIcon name="ai" className="size-4" />{labels.askDory}</Button>}
    <span className="dory-mode"><button type="button" className="flex size-9 items-center justify-center" aria-label="Toggle theme" onClick={() => { activeTheme = activeTheme === 'dark' ? 'light' : 'dark'; applyEmbeddedConfig(site, activeTheme); void showPage(page); }}><CatalogIcon name={activeTheme === 'dark' ? 'sun' : 'moon'} size={16} /></button></span>
    <button type="button" aria-label={labels.searchPages} onClick={() => setSearchOpen(true)} className="flex size-9 items-center justify-center text-white/70 lg:hidden"><CatalogIcon name="search" className="size-4" aria-hidden="true" /></button>
    {chatEnabled && <button type="button" aria-label={labels.askDory} onClick={() => setChatOpen(true)} className="flex size-9 items-center justify-center text-white/70 lg:hidden"><CatalogIcon name="ai" className="size-4" /></button>}
    <Button variant="outline" size="icon" className="relative flex size-6 border-white/15 bg-white/5 p-4 text-white hover:bg-white/10 lg:hidden" aria-label="Toggle navigation" onClick={() => setMobileOpen(true)}><CatalogIcon name="menu" className="w-8 stroke-white" /></Button>
  </>;
  const header = <DocsHeaderView name={siteName} logo={logo} homeHref={allPages[0]?.path ?? page}
    tabs={tabs.map(tab => ({ title: tab.title, href: tab.groups[0]?.pages[0]?.path ?? page, active: tab.groups.some(group => group.pages.some(item => item.path === page)) }))}
    renderLink={(href, className, children) => <button key={href} type="button" onClick={() => void showPage(href)} className={`${className} text-left`}>{children}</button>}
    actions={headerActions} docsLabel={labels.docsBadge} sectionsLabel={labels.sections}
    homeClassName="flex w-60 min-w-0 shrink-0 items-center gap-2.5 px-4 max-sm:w-auto max-sm:max-w-[65%]" embedded />;
  const sidebar = <DocsNavigationView
    groups={tabs.flatMap(tab => tab.groups).map(group => ({ title: group.title, pages: group.pages.map(item => ({ href: item.path, title: item.title, badge: item.badge })) }))}
    activeHref={page} renderPageLink={(item, className, active, children) => <button type="button" aria-current={active ? 'page' : undefined} onClick={() => void showPage(item.href)} className={`${className} w-full text-left`}>{children}</button>}
    versionLabel={site.version} versionCaption={labels.version} ariaLabel={labels.documentation} />;
  const prompt = encodeURIComponent(`Please read the documentation for ${title} and answer my questions about it.`);
  const pagerPages = tabs.flatMap(tab => tab.groups.flatMap(group => group.pages.map(item => ({ title: item.title, href: item.path, group: group.title }))));
  const repo = site.repository;
  const repoFile = repo ? `${repo.path ? `${repo.path.replace(/\/$/, '')}/` : ''}${repo.path ? page.replace(/^docs\//, '') : page}` : '';
  const editUrl = repo ? `${repo.url}/edit/${repo.branch ?? 'main'}/${repoFile}` : null;
  const issueUrl = repo ? `${repo.url}/issues/new?title=${encodeURIComponent(`Docs: ${title}`)}&body=${encodeURIComponent(`Page: ${page}`)}` : null;
  const actions = <PageActionsView
    onCopy={() => window.parent.postMessage({ __dory_docs: true, type: 'copy', path: page, requestId: String(++nextRequestId) }, '*')}
    onOpenChatGPT={() => send('external', { url: `https://chat.openai.com/?q=${prompt}` })}
    onOpenClaude={() => send('external', { url: `https://claude.ai/new?q=${prompt}` })}
  />;
  return <><DocsPageFrame
    className="dory-embedded-shell"
    header={header}
    sidebar={sidebar}
    breadcrumb={<Breadcrumb group={groupTitle} title={title} />}
    actions={actions}
    title={title}
    lead={lead}
    meta={<PageMeta meta={frontmatterMeta(source)} />}
    content={<EmbeddedContent module={module} title={title} />}
    afterContent={<>
      <PageFeedbackView pathname={page} onAnswer={helpful => window.parent.postMessage({ __dory_docs: true, type: 'feedback', path: page, helpful }, '*')} />
      <PrevNextLinksView pages={pagerPages} pathname={page} onNavigate={href => void showPage(href)} />
      <PageFooterView name={siteName} copyright={site.copyright} />
    </>}
    toc={<TableOfContentsView pageKey={page} editUrl={editUrl} issueUrl={issueUrl} labels={{ onThisPage: labels.onThisPage }} />}
  />
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="w-full overflow-y-auto border-white/10 bg-[var(--sidebar)] p-4 pt-12 text-white sm:max-w-sm">{sidebar}</SheetContent></Sheet>
    {searchOpen && <EmbeddedSearchDialog page={page} pages={allPages} query={search} setQuery={setSearch} indexing={indexing} onClose={() => setSearchOpen(false)} onAsk={() => { setSearchOpen(false); setChatOpen(true); }} onSelect={path => {
      setSearchOpen(false);
      const [nextPage, hash] = path.split('#', 2);
      void showPage(nextPage).then(() => { if (hash) document.getElementById(hash)?.scrollIntoView(); });
    }} />}
    {chatEnabled && chatOpen && <ChatDialog initialQuery={search} onClose={() => setChatOpen(false)} onSearch={() => { setChatOpen(false); setSearchOpen(true); }} />}
    {copyMessage && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--foreground)] shadow-lg">{copyMessage}</div>}
  </>;
}

function Status({ message, error = false }: { message: string; error?: boolean }) {
  return <div className="dory-shell flex min-h-screen flex-col bg-[var(--sidebar)]">
    <header className="dory-topbar flex h-14 items-center px-4 text-white"><span className="font-heading text-lg font-bold">{site.name ?? labels.documentation}</span><span className="dory-docs-pill ml-2 rounded border border-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-widest">{labels.docsBadge}</span></header>
    <main className="dory-main flex flex-1 items-start bg-background px-6 py-10 text-foreground sm:px-10 lg:px-12"><div role={error ? 'alert' : 'status'} className={error ? 'rounded-lg border border-destructive p-4 text-destructive' : 'text-muted-foreground'}>{message}</div></main>
  </div>;
}

async function showPage(path: string): Promise<void> {
  if (!manifest.has(path)) return;
  activePath = path;
  const current = ++version;
  render(<Status message={labels.rendering} />, root);
  try {
    const source = await readPage(path);
    if (current !== version) return;
    // MDX is executable JavaScript. Evaluate it only inside this opaque-origin
    // iframe, never in the WhoDB host. Imports are deliberately unsupported.
    const module = await evaluate(preprocessMdxSource(source, path), {
      ...jsxRuntime,
      ...getCommonMdxConfig(false),
    }) as MdxModule;
    if (current !== version) return;
    document.title = `${titleOf(path, source)} — ${site.title ?? site.name ?? labels.documentation}`;
    render(<Shell page={path} source={source} module={module} />, root);
    send('navigate', { path });
  } catch (error) {
    if (current !== version) return;
    const message = error instanceof Error ? error.message : labels.renderFailed;
    render(<Status message={message} error />, root);
    send('error', { message });
  }
}

window.addEventListener('message', event => {
  if (event.source !== window.parent) return;
  const data: unknown = event.data;
  if (!data || typeof data !== 'object') return;
  const file = data as Partial<FileMessage>;
  if (file.__dory_docs === true && file.type === 'file') {
    const pending = typeof file.requestId === 'string' ? pendingReads.get(file.requestId) : undefined;
    if (!pending) return;
    pendingReads.delete(file.requestId!);
    window.clearTimeout(pending.timeout);
    if (file.path !== pending.path || typeof file.content !== 'string' || file.content.length > 1_000_000) {
      pending.reject(new Error(labels.invalidPage));
      return;
    }
    files.set(pending.path, file.content);
    pending.resolve(file.content);
    return;
  }
  const chatResult = data as Partial<ChatResultMessage>;
  if (chatResult.__dory_docs === true && chatResult.type === 'chat-result') {
    const pending = typeof chatResult.requestId === 'string' ? pendingChats.get(chatResult.requestId) : undefined;
    if (!pending) return;
    pendingChats.delete(chatResult.requestId!);
    window.clearTimeout(pending.timeout);
    const answer = typeof chatResult.answer === 'string' && chatResult.answer.length <= 6_000 ? chatResult.answer : undefined;
    const error = typeof chatResult.error === 'string' && chatResult.error.length <= 300 ? chatResult.error : undefined;
    const citations = Array.isArray(chatResult.citations) ? chatResult.citations.slice(0, 5).flatMap(item => {
      if (!item || typeof item.path !== 'string' || !/^docs\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.mdx(?:#[a-zA-Z0-9_-]+)?$/.test(item.path)) return [];
      const pagePath = item.path.split('#', 1)[0];
      if (!manifest.has(pagePath) || !pagePath.startsWith(activeDocsRoot)) return [];
      const title = typeof item.title === 'string' && item.title.length <= 200 ? item.title : manifest.get(pagePath)!;
      const excerpt = typeof item.excerpt === 'string' && item.excerpt.length <= 300 ? item.excerpt : undefined;
      return [{ path: item.path, title, excerpt }];
    }) : [];
    const followUps = Array.isArray(chatResult.followUps) ? chatResult.followUps.slice(0, 4).filter((item): item is string => typeof item === 'string' && item.length >= 3 && item.length <= 120) : [];
    if (!answer && !error) pending.reject(new Error(labels.chatError));
    else pending.resolve({ __dory_docs: true, type: 'chat-result', requestId: chatResult.requestId!, answer, error, citations, followUps });
    return;
  }
  const message = data as Partial<LoadMessage>;
  if (message.__dory_docs !== true || message.type !== 'load' || !(Array.isArray(message.manifest) || Array.isArray(message.files))) return;
  site = parseEmbeddedConfig(message.config);
  const locale = typeof message.locale === 'string' && /^[a-z]{2}(?:[-_][a-zA-Z]{2})?$/.test(message.locale) ? message.locale : site.i18n?.defaultLocale ?? 'en_US';
  activeLocale = locale;
  const localeParts = locale.replace('_', '-').toLowerCase().split('-');
  const localePrefix = locale === 'en_US' ? '' : localeParts[0] === 'en' || localeParts[0] === 'zh' ? localeParts.join('-') : localeParts[0];
  activeDocsRoot = `docs/${localePrefix ? `${localePrefix}/` : ''}`;
  document.documentElement.lang = locale.replace('_', '-');
  document.documentElement.dir = /^(?:ar|fa|he|iw|ur)(?:[-_]|$)/.test(locale) ? 'rtl' : 'ltr';
  const supplied = message.labels && typeof message.labels === 'object' ? message.labels : {};
  labels = { ...defaultLabels };
  for (const key of Object.keys(defaultLabels) as (keyof Labels)[]) {
    const value = supplied[key];
    if (typeof value === 'string' && value.length <= 200) labels[key] = value;
  }
  const entries = Array.isArray(message.manifest) ? message.manifest : message.files!;
  if (entries.length === 0 || entries.length > 1000 || typeof message.path !== 'string') {
    send('error', { message: labels.noPages });
    return;
  }
  const nextManifest = new Map<string, string>();
  const nextFiles = new Map<string, string>();
  let total = 0;
  for (const entry of entries) {
    if (!entry || typeof entry.path !== 'string' || !filePath.test(entry.path)) {
      send('error', { message: labels.invalidPage });
      return;
    }
    if ('content' in entry) {
      if (typeof entry.content !== 'string' || entry.content.length > 1_000_000) {
        send('error', { message: labels.invalidPage });
        return;
      }
      total += entry.content.length;
      if (total > 10_000_000) {
        send('error', { message: labels.tooLarge });
        return;
      }
      nextFiles.set(entry.path, entry.content);
      nextManifest.set(entry.path, titleOf(entry.path, entry.content));
    } else {
      const title = typeof entry.title === 'string' && entry.title.length <= 200 ? entry.title.trim() : '';
      nextManifest.set(entry.path, title || entry.path.split('/').pop()!.replace(/\.mdx$/, '').replace(/[-_]/g, ' '));
    }
  }
  for (const pending of pendingReads.values()) {
    window.clearTimeout(pending.timeout);
    pending.reject(new Error(labels.renderFailed));
  }
  pendingReads.clear();
  for (const pending of pendingChats.values()) {
    window.clearTimeout(pending.timeout);
    pending.reject(new Error('The documentation changed. Please ask again.'));
  }
  pendingChats.clear();
  files = nextFiles;
  manifest = nextManifest;
  searchIndexEpoch++;
  embeddedSearchIndex = createSearchIndex();
  searchIndexPromise = null;
  const nextChatScope = `${site.name ?? ''}|${locale}|${[...manifest.entries()].map(([path, title]) => `${path}:${title}`).join('|')}`;
  if (chatScope !== nextChatScope) chatMessages = [];
  chatScope = nextChatScope;
  chatEnabled = message.chatEnabled === true;
  activeTheme = message.theme === 'light' || message.theme === 'dark' ? message.theme : site.theme?.mode === 'light' || site.theme?.mode === 'dark' ? site.theme.mode : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  applyEmbeddedConfig(site, activeTheme);
  void showPage(manifest.has(message.path) ? message.path : [...manifest.keys()][0] ?? '');
});

document.addEventListener('click', event => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  const link = target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('#')) return;
  event.preventDefault();
  if (/^https?:\/\//i.test(href)) {
    send('external', { url: href });
    return;
  }
  // Resolve relative links against the current MDX file and keep navigation
  // inside the supplied docs tree. Absolute / paths start at docs/.
  try {
    const base = `https://dory.invalid/${activePath.slice(activeDocsRoot.length)}`;
    const resolved = new URL(href, base);
    if (resolved.origin !== 'https://dory.invalid') return;
    const route = decodeURIComponent(resolved.pathname).replace(/^\/+|\/+$/g, '');
    const path = route ? `${activeDocsRoot}${route.endsWith('.mdx') ? route : `${route}.mdx`}` : `${activeDocsRoot}index.mdx`;
    if (!filePath.test(path) || !manifest.has(path)) return;
    void showPage(path).then(() => {
      if (resolved.hash) document.getElementById(decodeURIComponent(resolved.hash.slice(1)))?.scrollIntoView();
    });
  } catch { /* Invalid URLs cannot navigate the documentation frame. */ }
});

render(<Status message={labels.waiting} />, root);
send('ready');
