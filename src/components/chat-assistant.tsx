import { useEffect, useRef, useState } from 'preact/hooks';
import { withBase } from '../utils/base-path';
import { captureDocsEvent } from '../utils/analytics';

import { CatalogIcon, Button, CopyButton, copyToClipboard } from '@clidey/ux';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';

export type Citation = { id: string; title: string; url: string; excerpt: string };
export type Message = { role: 'user' | 'assistant'; content: string; citations?: Citation[]; followUps?: string[] };
export type ChatTransport = {
  status: () => Promise<boolean>;
  ask: (message: string, history: Pick<Message, 'role' | 'content'>[], pathname: string, signal: AbortSignal) => Promise<{ answer?: string; citations?: Citation[]; followUps?: string[]; error?: string }>;
};

class ChatRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

const defaultTransport: ChatTransport = {
  async status() {
    const response = await fetch(withBase('/api/chat/status'), { credentials: 'same-origin' });
    if (!response.headers.get('content-type')?.includes('application/json')) return false;
    const status = await response.json();
    return status?.enabled === true;
  },
  async ask(message, history, pathname, signal) {
    const response = await fetch(withBase('/api/chat'), {
      method: 'POST', credentials: 'same-origin', signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, pathname }),
    });
    const result = await response.json() as { answer?: string; citations?: Citation[]; followUps?: string[]; error?: string };
    if (!response.ok) throw new ChatRequestError(result.error || 'The answer is unavailable right now.', response.status);
    return result;
  },
};

const site = docsConfig as DoryConfig;
const suggestedQuestions = Array.isArray(site.chat?.suggestedQuestions)
  ? site.chat.suggestedQuestions.filter(question => typeof question === 'string' && question.trim().length >= 3 && question.trim().length <= 600).slice(0, 4)
  : [];
const starters = suggestedQuestions?.length ? suggestedQuestions : [
  `How do I get started with ${site.name}?`,
  `What can I do with ${site.name}?`,
  'Explain this page',
];

function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-[var(--accent)] px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    return part;
  });
}

function AnswerText({ text }: { text: string }) {
  return <div className="space-y-3 text-sm leading-7 text-foreground sm:text-base">{text.split(/(```[^\n]*\n[\s\S]*?```)/g).map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const language = part.slice(3, part.indexOf('\n')).trim();
      const code = part.slice(part.indexOf('\n') + 1, -3).trimEnd();
      return <div key={index} className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--accent)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-1 text-xs text-muted-foreground">
          <span>{language || 'Code'}</span>
          <CopyButton text={code} tooltipLabel="Copy code" copiedLabel="Code copied" onCopy={() => captureDocsEvent('docs_chat_code_copied', { path: window.location.pathname })} />
        </div>
        <pre className="overflow-x-auto p-4 text-sm leading-6"><code>{code}</code></pre>
      </div>;
    }
    return part.split(/\n\s*\n/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={`${index}-${paragraphIndex}`} className="whitespace-pre-wrap">{renderInline(paragraph.trim())}</p>);
  })}</div>;
}

function CopyAnswerButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return <Button type="button" variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground" onClick={async () => {
    if (await copyToClipboard(text)) {
      setCopied(true);
      captureDocsEvent('docs_chat_answer_copied', { path: window.location.pathname });
    }
  }}>
    <CatalogIcon name={copied ? 'check' : 'copy'} className="h-4 w-4" />
    {copied ? 'Copied' : 'Copy answer'}
  </Button>;
}

export function useChatAssistant(options: { transport?: ChatTransport; initialMessages?: Message[]; initialDraft?: string; onMessagesChange?: (messages: Message[]) => void } = {}) {
  const transport = options.transport ?? defaultTransport;
  const [enabled, setEnabled] = useState(false);
  const [messages, setMessages] = useState<Message[]>(options.initialMessages ?? []);
  const [draft, setDraft] = useState(options.initialDraft ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    transport.status()
      .then(setEnabled)
      .catch(() => setEnabled(false));
    return () => controller.current?.abort();
  }, []);
  useEffect(() => { options.onMessagesChange?.(messages); }, [messages]);

  function reset() {
    controller.current?.abort();
    controller.current = null;
    setMessages([]);
    setDraft('');
    setError('');
    setBusy(false);
  }

  async function ask(question = draft) {
    const text = question.trim();
    if (busy || text.length < 3 || text.length > 600) return;
    const previous = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    setMessages(current => [...current, { role: 'user', content: text }]);
    setDraft('');
    setError('');
    setBusy(true);
    captureDocsEvent('docs_chat_question', { path: window.location.pathname, question_length: text.length });
    let errorKind = 'network';
    const request = new AbortController();
    controller.current = request;
    try {
      const result = await transport.ask(text, previous, window.location.pathname, request.signal);
      if (!result.answer) { errorKind = 'invalid_answer'; throw new Error(result.error || 'The answer is unavailable right now.'); }
      if (!request.signal.aborted) {
        setMessages(current => [...current, { role: 'assistant', content: result.answer!, citations: result.citations, followUps: result.followUps }]);
        captureDocsEvent('docs_chat_answer', { path: window.location.pathname, citation_count: result.citations?.length ?? 0 });
      }
    } catch (cause) {
      if (!request.signal.aborted) {
        if (cause instanceof ChatRequestError) errorKind = cause.status === 429 ? 'rate_limited' : 'server_error';
        setError(cause instanceof Error ? cause.message : 'The answer is unavailable right now.');
        captureDocsEvent('docs_chat_error', { path: window.location.pathname, error_kind: errorKind });
      }
    } finally {
      if (controller.current === request) {
        controller.current = null;
        setBusy(false);
      }
    }
  }

  return { enabled, messages, draft, setDraft, busy, error, ask, reset };
}

export function ChatAssistant({ chat, onNavigate, onSearch, siteName = site.name, questions = starters, intro, onSourceClick }: {
  chat: ReturnType<typeof useChatAssistant>;
  onNavigate: () => void;
  onSearch: () => void;
  siteName?: string;
  questions?: string[];
  intro?: string;
  onSourceClick?: (source: Citation) => void;
}) {
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { input.current?.focus(); }, [chat.messages.length === 0]);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [chat.messages, chat.busy]);

  const composer = (
    <form className="dory-chat-composer border-t border-[var(--border)] p-4 sm:px-6" onSubmit={event => { event.preventDefault(); chat.ask(); }}>
      <label htmlFor="dory-chat-question" className="sr-only">Your documentation question</label>
      <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 focus-within:border-[var(--brand-primary)]">
        <textarea id="dory-chat-question" ref={input} value={chat.draft} onInput={event => chat.setDraft(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); chat.ask(); } else if (event.key === 'Tab' && !event.shiftKey) { event.preventDefault(); onSearch(); } }} rows={1} maxLength={600} placeholder={chat.messages.length ? 'Ask a follow-up' : `Ask Dory anything about ${siteName}`} className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" />
        <button type="button" disabled={chat.busy || chat.draft.trim().length < 3} onClick={() => void chat.ask()} className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40" aria-label="Send question">↑</button>
      </div>
      {chat.messages.length > 0 && <p className="mt-2 text-center text-[11px] text-muted-foreground">Sources are linked when the docs support an answer. Check important details on the page.</p>}
    </form>
  );

  return (
    <div className={`dory-search-chat flex flex-col ${chat.messages.length === 0 ? 'h-[min(58vh,480px)]' : 'h-[min(78vh,640px)] sm:h-[min(72vh,620px)]'}`}>
      {chat.messages.length === 0 && composer}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8" aria-live="polite">
        {chat.messages.length === 0 && (
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">{intro ?? 'Ask in plain language. Dory reads these docs and answers with links to the sections it used.'}</p>
            <div className="grid gap-2">
              {questions.map(prompt => <button key={prompt} type="button" onClick={() => chat.ask(prompt)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--accent)]"><CatalogIcon name="arrow-up-right" className="h-4 w-4 shrink-0 text-[var(--primary)]" /><span>{prompt}</span></button>)}
            </div>
          </div>
        )}
        <div className="space-y-6">
          {chat.messages.map((message, index) => (
            <div key={index} className="space-y-3">
              {message.role === 'user' ? (
                <h2 className="text-xl font-semibold leading-snug text-foreground">{message.content}</h2>
              ) : (
                <div className="dory-chat-answer space-y-4">
                  <AnswerText text={message.content} />
                  <CopyAnswerButton text={message.content} />
                  {message.citations && message.citations.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {message.citations.map((source, sourceIndex) => <a key={source.id} href={onSourceClick ? '#' : withBase(source.url)} onClick={event => { if (onSourceClick) { event.preventDefault(); onSourceClick(source); } else { captureDocsEvent('docs_chat_source_clicked', { path: window.location.pathname, source: source.url }); onNavigate(); } }} className="min-w-36 rounded-lg border border-[var(--border)] px-3 py-2 hover:bg-[var(--accent)]">
                          <span className="block text-sm font-medium text-foreground"><span className="mr-2 text-[var(--brand-primary)]">{sourceIndex + 1}</span>{source.title}</span>
                          {source.excerpt && <span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{source.excerpt}</span>}
                        </a>)}
                      </div>
                    </div>
                  )}
                  {message.followUps && message.followUps.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">{message.followUps.map(prompt => <button key={prompt} type="button" onClick={() => chat.ask(prompt)} disabled={chat.busy} className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs hover:bg-[var(--accent)] disabled:opacity-50">→ &nbsp; {prompt}</button>)}</div>
                  )}
                </div>
              )}
            </div>
          ))}
          {chat.busy && <p className="text-sm text-muted-foreground" role="status">Reading the docs and checking sources…</p>}
          {chat.error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300" role="alert">{chat.error}</p>}
          <div ref={bottom} />
        </div>
      </div>
      {chat.messages.length > 0 && composer}
    </div>
  );
}
