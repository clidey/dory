import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { join } from 'node:path';

type AnalyticsOptions = { projectRoot: string; basePath?: string };
type PostHogConfig = { token: string; endpoint: string };

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';
const aiAgents: Array<[string, RegExp]> = [
  ['ChatGPT-User', /chatgpt-user/i], ['GPTBot', /gptbot/i], ['OAI-SearchBot', /oai-searchbot/i],
  ['Claude-User', /claude-user/i], ['ClaudeBot', /claudebot/i], ['Claude-SearchBot', /claude-searchbot/i],
  ['PerplexityBot', /perplexitybot/i], ['Perplexity-User', /perplexity-user/i],
  ['Meta-ExternalAgent', /meta-externalagent/i],
];

function postHogConfig(projectRoot: string): PostHogConfig | undefined {
  const rootConfig = join(projectRoot, 'dory.json');
  const configPath = existsSync(rootConfig) ? rootConfig : join(projectRoot, 'docs', 'dory.json');
  if (!existsSync(configPath)) return undefined;

  try {
    const config = JSON.parse(readFileSync(configPath, 'utf8')) as {
      analytics?: { posthog?: { token?: unknown; apiHost?: unknown } };
    };
    const token = config.analytics?.posthog?.token;
    if (typeof token !== 'string' || !token.trim()) return undefined;
    const host = config.analytics?.posthog?.apiHost || DEFAULT_POSTHOG_HOST;
    if (typeof host !== 'string') return undefined;
    const url = new URL(host);
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) || url.username || url.password || url.search || url.hash) return undefined;
    const base = url.href.endsWith('/') ? url : new URL(url.href + '/');
    return { token: token.trim(), endpoint: new URL('i/v0/e/', base).href };
  } catch {
    console.warn('Dory analytics could not read PostHog configuration');
    return undefined;
  }
}

function safePath(value: string): string {
  const path = value.split(/[?#]/, 1)[0];
  return path.length <= 240 && /^\/[a-zA-Z0-9/_~.%-]*$/.test(path) ? path : '/';
}

function safeReferrer(value: string | undefined, host: string | undefined): string {
  if (!value) return 'Direct';
  try {
    const url = new URL(value);
    return url.host === host ? 'Internal' : url.hostname.slice(0, 100);
  } catch { return 'Direct'; }
}

function isDocumentationPath(path: string): boolean {
  if (path.startsWith('/__dory/') || path.startsWith('/api/') || path.startsWith('/assets/')) return false;
  if (['/favicon.ico', '/favicon.svg', '/robots.txt', '/sitemap.xml', '/frontmatter.json', '/search-content.json', '/embed.js', '/embed-widget.js'].includes(path)) return false;
  if (path === '/llms.txt' || path === '/llms-full.txt') return true;
  if (/\.(?:mdx|md)$/.test(path)) return true;
  return !/\.[a-z0-9]{1,8}$/i.test(path);
}

function declaredAgent(userAgent: string): string | undefined {
  return aiAgents.find(([, pattern]) => pattern.test(userAgent))?.[0];
}

function isOtherBot(userAgent: string): boolean {
  return /bot|crawler|spider|curl\/|wget\/|python-requests|headless/i.test(userAgent);
}

/** Sends server-observed requests to PostHog without retaining IPs or user-agent strings. */
export function createAnalytics(options: AnalyticsOptions) {
  const posthog = postHogConfig(options.projectRoot);
  let warnedDeliveryFailure = false;

  function capture(event: 'docs_page_request' | 'docs_ai_request', properties: Record<string, string>): void {
    if (!posthog) return;

    void fetch(posthog.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: posthog.token,
        event,
        timestamp: new Date().toISOString(),
        properties: { ...properties, distinct_id: randomUUID(), $process_person_profile: false },
      }),
      signal: AbortSignal.timeout(5_000),
    }).then(response => {
      if (!response.ok) throw new Error('PostHog rejected an analytics event');
    }).catch(() => {
      if (!warnedDeliveryFailure) {
        console.warn('Dory could not deliver analytics to PostHog');
        warnedDeliveryFailure = true;
      }
    });
  }

  function recordRequest(req: IncomingMessage, status: number): void {
    if (!posthog || req.method !== 'GET' || (status !== 200 && status !== 304)) return;
    let pathname: string;
    try { pathname = new URL(req.url ?? '/', 'http://localhost').pathname; }
    catch { return; }
    const prefix = options.basePath?.replace(/\/$/, '') ?? '';
    const path = safePath(prefix && pathname.startsWith(prefix + '/') ? pathname.slice(prefix.length) : pathname);
    if (!isDocumentationPath(path)) return;

    const userAgent = String(req.headers['user-agent'] ?? '').slice(0, 250);
    const agent = declaredAgent(userAgent);
    if (agent) {
      capture('docs_ai_request', { path, agent });
    } else if (!isOtherBot(userAgent)) {
      const referrer = safeReferrer(typeof req.headers.referer === 'string' ? req.headers.referer : undefined, req.headers.host);
      capture('docs_page_request', { path, referrer });
    }
  }

  return { recordRequest };
}
