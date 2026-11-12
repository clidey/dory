import { CopyButton } from '@clidey/ux';
import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { MermaidRenderer } from '../mdx/mermaid';
import { withBase } from '../utils/base-path';
import { captureDocsEvent } from '../utils/analytics';

/** Media selected by the server from the documentation excerpts it cited. */
export type ChatMedia = {
  id: string;
  type: 'image' | 'video' | 'audio';
  url: string;
  alt: string;
  sourceId: string;
};

type MarkdownNode = {
  type: string;
  value?: string;
  children?: MarkdownNode[];
  url?: string;
  alt?: string;
  title?: string | null;
  lang?: string | null;
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  checked?: boolean | null;
  identifier?: string;
  align?: ('left' | 'right' | 'center' | null)[];
};

const markdown = unified().use(remarkParse).use(remarkGfm);

function safeUrl(value: string, media = false): string | undefined {
  const url = value.trim();
  if (!url || /[\u0000-\u0020\u007f\\]/.test(url) || url.startsWith('//')) return;
  if (url.startsWith('/') || (!media && url.startsWith('#'))) return withBase(url);
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return;
    if (parsed.protocol === 'https:' || (!media && parsed.protocol === 'http:')) return parsed.href;
  } catch {
    // Relative documentation links are useful in answers; media must be absolute
    // or root-relative because its location was resolved by the server.
    if (!media && !url.includes(':') && !url.startsWith('?')) return url;
  }
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const diagram = language.toLowerCase() === 'mermaid';
  return <div className="my-4 overflow-hidden rounded-lg border border-border bg-background">
    <div className="flex items-center justify-between gap-3 border-b border-border bg-accent/40 px-4 py-2">
      <span className="font-mono text-xs text-muted-foreground">{diagram ? 'Diagram' : language || 'Code'}</span>
      <CopyButton text={code} tooltipLabel={diagram ? 'Copy diagram source' : 'Copy code'} copiedLabel="Copied"
        onCopy={() => captureDocsEvent('docs_chat_code_copied', { path: window.location.pathname })} />
    </div>
    {diagram ? <div className="px-4">
      <MermaidRenderer content={code} untrusted />
      <details className="mb-4 text-sm text-muted-foreground">
        <summary className="cursor-pointer">Diagram source</summary>
        <pre className="mt-3 overflow-x-auto whitespace-pre p-3 font-mono text-xs leading-6"><code>{code}</code></pre>
      </details>
    </div> : <pre className="overflow-x-auto whitespace-pre p-4 font-mono text-xs leading-6 sm:text-sm"><code>{code}</code></pre>}
  </div>;
}

function MediaContent({ item, url }: { item: ChatMedia; url: string }) {
  if (item.type === 'image') return <img src={url} alt={item.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="max-h-[32rem] max-w-full rounded-md object-contain" />;
  if (item.type === 'video') return <video src={url} aria-label={item.alt} controls preload="none" playsInline className="max-h-[32rem] w-full rounded-md">Your browser does not support video playback.</video>;
  return <audio src={url} aria-label={item.alt} controls preload="none" className="w-full">Your browser does not support audio playback.</audio>;
}

/** Plain Markdown only: no MDX evaluation, raw HTML, or model-selected remote media. */
export function ChatAnswer({ text, media = [] }: { text: string; media?: ChatMedia[] }) {
  const tree = useMemo(() => markdown.parse(text.slice(0, 100_000)) as MarkdownNode, [text]);
  const definitions = new Map<string, MarkdownNode>();
  for (const node of tree.children ?? []) {
    if (node.type === 'definition' && node.identifier) definitions.set(node.identifier, node);
  }
  const approvedMedia = media.slice(0, 12).flatMap(item => {
    const url = safeUrl(item.url, true);
    return url && ['image', 'video', 'audio'].includes(item.type) ? [{ item, url }] : [];
  });
  const usedMedia = new Set<string>();

  const renderNodes = (nodes: MarkdownNode[] = [], depth = 0): ComponentChildren => nodes.map((node, index) => {
    if (depth > 32) return null;
    const children = () => renderNodes(node.children, depth + 1);
    const definition = node.identifier ? definitions.get(node.identifier) : undefined;
    switch (node.type) {
      case 'text': return node.value;
      case 'paragraph': return <p key={index} className="my-3 break-words">{children()}</p>;
      case 'heading': return node.depth === 1 || node.depth === 2
        ? <h3 key={index} className="mb-3 mt-6 text-lg font-semibold">{children()}</h3>
        : <h4 key={index} className="mb-2 mt-5 font-semibold">{children()}</h4>;
      case 'strong': return <strong key={index} className="font-semibold">{children()}</strong>;
      case 'emphasis': return <em key={index}>{children()}</em>;
      case 'delete': return <del key={index}>{children()}</del>;
      case 'inlineCode': return <code key={index} className="rounded bg-accent px-1.5 py-0.5 font-mono text-[0.9em]">{node.value}</code>;
      case 'break': return <br key={index} />;
      case 'thematicBreak': return <hr key={index} className="my-5 border-border" />;
      case 'blockquote': return <blockquote key={index} className="my-4 border-l-2 border-primary/50 pl-4 text-muted-foreground">{children()}</blockquote>;
      case 'list': return node.ordered
        ? <ol key={index} start={node.start ?? 1} className="my-3 list-decimal space-y-1 pl-6">{children()}</ol>
        : <ul key={index} className="my-3 list-disc space-y-1 pl-6">{children()}</ul>;
      case 'listItem': return <li key={index} className="pl-1">{typeof node.checked === 'boolean' && <input type="checkbox" checked={node.checked} disabled aria-label={node.checked ? 'Completed' : 'Incomplete'} className="mr-2" />}{children()}</li>;
      case 'code': return <CodeBlock key={index} code={node.value ?? ''} language={node.lang ?? ''} />;
      case 'link':
      case 'linkReference': {
        const href = safeUrl(node.url ?? definition?.url ?? '');
        return href ? <a key={index} href={href} title={node.title ?? definition?.title ?? undefined} rel="noopener noreferrer" className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary">{children()}</a> : <span key={index}>{children()}</span>;
      }
      case 'image':
      case 'imageReference': {
        const reference = node.url ?? definition?.url ?? '';
        const approved = approvedMedia.find(({ item }) => item.type === 'image' && (reference === item.url || reference === item.id || reference === `media:${item.id}`));
        if (!approved) return node.alt ? <span key={index}>{node.alt}</span> : null;
        usedMedia.add(approved.item.id);
        return <span key={index} className="my-4 block"><MediaContent item={approved.item} url={approved.url} /><span className="mt-2 block text-xs text-muted-foreground">{approved.item.alt}</span></span>;
      }
      case 'table': {
        const [head, ...rows] = node.children ?? [];
        const row = (value: MarkdownNode, rowIndex: number, header: boolean) => <tr key={rowIndex} className="border-b border-border last:border-0">{value.children?.map((cell, cellIndex) => header
          ? <th key={cellIndex} style={{ textAlign: node.align?.[cellIndex] ?? 'left' }} className="px-3 py-2 font-semibold">{renderNodes(cell.children, depth + 1)}</th>
          : <td key={cellIndex} style={{ textAlign: node.align?.[cellIndex] ?? 'left' }} className="px-3 py-2 align-top">{renderNodes(cell.children, depth + 1)}</td>)}</tr>;
        return <div key={index} className="my-4 overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm">{head && <thead className="bg-accent/40">{row(head, 0, true)}</thead>}<tbody>{rows.map((value, rowIndex) => row(value, rowIndex, false))}</tbody></table></div>;
      }
      case 'html': return null;
      case 'definition': return null;
      default: return children();
    }
  });

  const content = renderNodes(tree.children);
  return <div className="text-sm leading-7 text-foreground sm:text-base">
    {content}
    {approvedMedia.filter(({ item }) => !usedMedia.has(item.id)).map(({ item, url }) => <figure key={item.id} className="my-5 space-y-2">
      <MediaContent item={item} url={url} />
      <figcaption className="text-xs text-muted-foreground">{item.alt}</figcaption>
    </figure>)}
  </div>;
}
