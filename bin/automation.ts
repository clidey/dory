import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import sirv from 'sirv';

const excludedDirectories = new Set(['node_modules', 'dist', '.git', '.dory']);

export function projectInfo(root: string) {
  const path = resolve(root, 'dory.json');
  if (!existsSync(path)) throw new Error(`dory.json not found in ${root}`);
  const config = JSON.parse(readFileSync(path, 'utf8'));
  return { root: resolve(root), config, pages: listPages(root) };
}

export function listPages(root: string): string[] {
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory() && !excludedDirectories.has(entry.name)) walk(join(dir, entry.name));
      else if (entry.isFile() && entry.name.endsWith('.mdx')) pages.push(relative(root, join(dir, entry.name)).split(sep).join('/'));
    }
  };
  walk(resolve(root));
  return pages.sort();
}

export function pagePath(root: string, page: string): string {
  if (!page.endsWith('.mdx') || isAbsolute(page)) throw new Error('Page must be a relative .mdx path');
  const absolute = resolve(root, page);
  const rel = relative(resolve(root), absolute);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) throw new Error('Page is outside the project');
  let parent = dirname(absolute);
  while (parent !== resolve(root)) {
    if (existsSync(parent) && lstatSync(parent).isSymbolicLink()) throw new Error('Symbolic link directory is not allowed');
    parent = dirname(parent);
  }
  if (existsSync(absolute) && lstatSync(absolute).isSymbolicLink()) throw new Error('Symbolic link page is not allowed');
  return absolute;
}

export function readPage(root: string, page: string): string {
  const path = pagePath(root, page);
  if (!existsSync(path)) throw new Error(`Page not found: ${page}`);
  return readFileSync(path, 'utf8');
}

export function writePage(root: string, page: string, content: string): string {
  projectInfo(root);
  const path = pagePath(root, page);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
  return path;
}

export async function runDory(root: string, entrypoint: string, args: string[]) {
  return new Promise<{ code: number; output: string }>((done, reject) => {
    const child = spawn(process.execPath, [entrypoint, ...args], { cwd: root, env: process.env });
    let output = '';
    const append = (chunk: Buffer) => { output += chunk.toString(); if (output.length > 100_000) output = output.slice(-100_000); };
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.once('error', reject);
    child.once('close', code => done({ code: code ?? 1, output }));
  });
}

function basePath(root: string): string {
  const config = projectInfo(root).config;
  const value = typeof config.basePath === 'string' ? config.basePath.replace(/^\/+|\/+$/g, '') : '';
  return value ? `/${value}` : '';
}

function browserPath(): string | undefined {
  const candidates = [
    process.env.DORY_CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find(path => path && existsSync(path));
}

export interface ScreenshotOptions {
  route?: string;
  output?: string;
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
}

function screenshotOutput(root: string, requested: string): string {
  const projectRoot = realpathSync(root);
  const screenshotsDir = resolve(projectRoot, '.dory', 'screenshots');
  const output = resolve(projectRoot, requested);
  const rel = relative(screenshotsDir, output);
  if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel) || extname(output).toLowerCase() !== '.png') {
    throw new Error('Screenshot output must be a .png file inside .dory/screenshots');
  }
  let current = output;
  while (current !== projectRoot) {
    if (lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) throw new Error('Screenshot output cannot use symbolic links');
    current = dirname(current);
  }
  return output;
}

export async function screenshot(root: string, options: ScreenshotOptions = {}) {
  const { chromium } = await import('playwright-core');
  const dist = resolve(root, 'dist');
  if (!existsSync(resolve(dist, 'index.html'))) throw new Error('dist/index.html is missing; run dory build first');
  const route = `/${(options.route ?? '').replace(/^\/+/, '')}`;
  const output = screenshotOutput(root, options.output ?? `.dory/screenshots/${basename(route) || 'index'}-${options.theme ?? 'light'}.png`);
  const executablePath = browserPath();
  if (!executablePath) throw new Error('Chrome/Chromium not found. Set DORY_CHROME_PATH to its executable.');
  const prefix = basePath(root);
  const serve = sirv(dist, { single: true, dev: false });
  const server = createServer((req, res) => {
    if (prefix && req.url?.startsWith(`${prefix}/`)) req.url = req.url.slice(prefix.length);
    serve(req, res);
  });
  await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not start preview server');
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    browser = await chromium.launch({ executablePath, headless: true });
    const page = await browser.newPage({ viewport: { width: options.width ?? 1440, height: options.height ?? 900 }, colorScheme: options.theme ?? 'light', deviceScaleFactor: 1 });
    const url = `http://127.0.0.1:${address.port}${prefix}${route}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.evaluate('document.fonts.ready');
    mkdirSync(dirname(output), { recursive: true });
    const data = await page.screenshot({ path: output, fullPage: true });
    return { output, url, data };
  } finally {
    await browser?.close();
    await new Promise<void>(done => server.close(() => done()));
  }
}

const blockedIPv4 = new BlockList();
const blockedIPv6 = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
  ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
  ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) blockedIPv4.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of [
  ['::', 128], ['::1', 128], ['::ffff:0:0', 96], ['fc00::', 7],
  ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['2002::', 16],
] as const) blockedIPv6.addSubnet(address, prefix, 'ipv6');

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedIPv4.check(address, 'ipv4');
  if (family === 6) return /^[23]/.test(address) && !blockedIPv6.check(address, 'ipv6');
  return false;
}

async function publicAddress(url: URL): Promise<{ address: string; family: 4 | 6 }> {
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use a public HTTP or HTTPS URL without credentials');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) as 4 | 6 }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(item => !isPublicAddress(item.address))) throw new Error(`URL must resolve to a public address: ${url.hostname}`);
  return addresses[0] as { address: string; family: 4 | 6 };
}

async function getText(url: URL): Promise<string> {
  const signal = AbortSignal.timeout(15_000);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const pinned = await publicAddress(url);
    const response = await new Promise<{ status: number; location?: string; body: string }>((done, reject) => {
      const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
        signal,
        headers: { Accept: 'text/plain, text/html', 'Accept-Encoding': 'identity' },
        maxHeaderSize: 16_384,
        lookup: (_hostname, options, callback) => {
          if (typeof options === 'object' && options.all) callback(null, [pinned]);
          else callback(null, pinned.address, pinned.family);
        },
      }, res => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          done({ status, location: res.headers.location, body: '' });
          res.destroy();
          return;
        }
        if (status < 200 || status >= 300) {
          reject(new Error(`${url}: HTTP ${status}`));
          res.destroy();
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > 5_000_000) {
            res.destroy(new Error(`${url}: content exceeds 5 MB`));
            return;
          }
          chunks.push(chunk);
        });
        res.once('end', () => done({ status, body: Buffer.concat(chunks).toString('utf8') }));
        res.once('error', reject);
      });
      request.once('error', reject);
      request.end();
    });
    if (!response.location) return response.body;
    url = new URL(response.location, url);
  }
  throw new Error('Too many redirects while reading documentation');
}

export async function discoverSite(address: string) {
  const site = new URL(address);
  if (!['http:', 'https:'].includes(site.protocol)) throw new Error('Use an HTTP or HTTPS URL');
  const html = await getText(site);
  const alternate = html.match(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\btitle=["']LLM documentation index["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
  const candidates = [alternate && new URL(alternate, site), new URL('llms.txt', site), new URL('/llms.txt', site)].filter((url): url is URL => Boolean(url));
  let indexUrl: URL | undefined;
  let index = '';
  for (const candidate of candidates) {
    try {
      const content = await getText(candidate);
      if (!/^#\s+.+/m.test(content)) continue;
      indexUrl = candidate;
      index = content;
      break;
    } catch { /* Try the next standard discovery location. */ }
  }
  if (!indexUrl) throw new Error(`No llms.txt index found for ${site.href}`);
  const pages = [...index.matchAll(/\[[^\]]+\]\(([^)]+\.mdx(?:\?[^)]*)?)\)/g)].map(match => new URL(match[1], indexUrl).href);
  const fullUrl = new URL('llms-full.txt', indexUrl);
  return { site: site.href, indexUrl: indexUrl.href, fullUrl: fullUrl.href, pages, index };
}

export async function readRemotePage(address: string) {
  const url = new URL(address);
  if (!['http:', 'https:'].includes(url.protocol) || extname(url.pathname) !== '.mdx') throw new Error('Use an HTTP or HTTPS .mdx URL');
  return getText(url);
}
