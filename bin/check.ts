import { existsSync, readFileSync, readdirSync } from 'fs';
import { extname, join, relative, resolve, dirname, sep } from 'path';
import matter from 'gray-matter';
import { resolveStylesheets } from './styles.js';

export interface CheckIssue {
  level: 'error' | 'warning';
  file: string;
  message: string;
  line?: number;
}

export interface CheckResult {
  issues: CheckIssue[];
  pages: number;
  errors: number;
  warnings: number;
}

interface Page {
  file: string;
  route: string;
  body: string;
  anchors: Set<string>;
}

const filePath = (root: string, file: string): string => relative(root, file).split(sep).join('/');

function walkMdx(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const path = join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== 'dist') return walkMdx(path);
    return item.isFile() && item.name.endsWith('.mdx') ? [path] : [];
  });
}

function withoutFences(body: string): string {
  return body.replace(/(^|\n)([ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\3[ \t]*(?=\n|$)/g, match => '\n'.repeat(match.split('\n').length - 1));
}

function slug(value: string): string {
  return value.toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim().replace(/\s+/g, '-');
}

function headings(body: string): Set<string> {
  const anchors = new Set<string>();
  const counts = new Map<string, number>();
  const plain = withoutFences(body);
  for (const match of plain.matchAll(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = slug(match[1]);
    if (!base) continue;
    const count = counts.get(base) || 0;
    anchors.add(count ? `${base}-${count}` : base);
    counts.set(base, count + 1);
  }
  for (const match of plain.matchAll(/\bid=["']([^"']+)["']/g)) anchors.add(match[1]);
  return anchors;
}

function routeFor(file: string, contentRoot: string): string {
  const path = filePath(contentRoot, file).replace(/\.mdx$/, '').toLowerCase();
  return path === 'index' ? '/' : `/${path.replace(/\/index$/, '')}`;
}

function navigationPages(config: Record<string, unknown>, issue: (level: CheckIssue['level'], file: string, message: string) => void): string[] {
  const navigation = config.navigation as Record<string, unknown> | undefined;
  if (!Array.isArray(navigation?.tabs) || navigation.tabs.length === 0) {
    issue('error', 'dory.json', 'navigation.tabs must be a non-empty array');
    return [];
  }
  const pages: string[] = [];
  for (const tab of navigation.tabs) {
    if (!tab || typeof tab !== 'object' || !Array.isArray(tab.groups)) {
      issue('error', 'dory.json', 'Each navigation tab needs groups');
      continue;
    }
    for (const group of tab.groups) {
      if (!group || typeof group !== 'object' || !Array.isArray(group.pages)) {
        issue('error', 'dory.json', 'Each navigation group needs pages');
        continue;
      }
      const visit = (entries: unknown[]) => {
        for (const entry of entries) {
          if (typeof entry === 'string') pages.push(entry);
          else if (entry && typeof entry === 'object') {
            if ('page' in entry && typeof entry.page === 'string') pages.push(entry.page);
            else if ('pages' in entry && Array.isArray(entry.pages)) visit(entry.pages);
            else issue('error', 'dory.json', 'Navigation page must be a path or { page: path }');
          } else issue('error', 'dory.json', 'Navigation page must be a path or { page: path }');
        }
      };
      visit(group.pages);
    }
  }
  return pages;
}

/** Validate a Dory project without writing files or making network requests. */
export function checkProject(projectRoot: string): CheckResult {
  const root = resolve(projectRoot);
  const issues: CheckIssue[] = [];
  const issue = (level: CheckIssue['level'], file: string, message: string, line?: number) => issues.push({ level, file, message, line });
  const configPath = existsSync(join(root, 'dory.json')) ? join(root, 'dory.json') : join(root, 'docs', 'dory.json');
  if (!existsSync(configPath)) {
    issue('error', 'dory.json', 'Missing dory.json');
    return { issues, pages: 0, errors: 1, warnings: 0 };
  }

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'));
    if (!config || Array.isArray(config) || typeof config !== 'object') throw new Error('Expected a JSON object');
  } catch (error) {
    issue('error', filePath(root, configPath), `Invalid JSON: ${String(error)}`);
    return { issues, pages: 0, errors: 1, warnings: 0 };
  }
  if (typeof config.name !== 'string' || !config.name.trim()) issue('error', filePath(root, configPath), 'name must be a non-empty string');
  if (config.basePath !== undefined && typeof config.basePath !== 'string') issue('error', filePath(root, configPath), 'basePath must be a string');

  const configDir = dirname(configPath);
  const contentRoot = configDir === root && walkMdx(join(root, 'docs')).length ? join(root, 'docs') : configDir;
  try {
    resolveStylesheets(config.styles, contentRoot);
  } catch (error) {
    issue('error', filePath(root, configPath), error instanceof Error ? error.message : String(error));
  }
  const files = walkMdx(contentRoot);
  if (!files.length) issue('error', filePath(root, contentRoot), 'No MDX pages found');
  const pages = new Map<string, Page>();
  for (const file of files) {
    const display = filePath(root, file);
    try {
      const parsed = matter(readFileSync(file, 'utf8'));
      if (typeof parsed.data.title !== 'string' || !parsed.data.title.trim()) issue('error', display, 'Frontmatter title is required');
      if (typeof parsed.data.description !== 'string' || !parsed.data.description.trim()) issue('warning', display, 'Add a frontmatter description');
      const route = routeFor(file, contentRoot);
      if (pages.has(route)) issue('error', display, `Duplicate route ${route}`);
      pages.set(route, { file, route, body: parsed.content, anchors: headings(parsed.content) });
    } catch (error) {
      issue('error', display, `Cannot parse frontmatter: ${String(error)}`);
    }
  }

  const nav = navigationPages(config, issue);
  const navSet = new Set<string>();
  for (const entry of nav) {
    const route = `/${entry.replace(/^\/+|\/+$/g, '').replace(/\.mdx$/, '').toLowerCase()}`;
    if (!pages.has(route)) issue('error', filePath(root, configPath), `Navigation page does not exist: ${entry}`);
    if (navSet.has(route)) issue('warning', filePath(root, configPath), `Duplicate navigation page: ${entry}`);
    navSet.add(route);
  }

  const variantIds = new Set<string>();
  const checkVariant = (prefix: string, navigation: unknown, label: string) => {
    if (!navigation) return;
    const entries = navigationPages({ navigation }, issue);
    for (const entry of entries) {
      const route = `/${prefix}/${entry.replace(/^\/+|\/+$/g, '').replace(/\.mdx$/, '').toLowerCase()}`;
      if (!pages.has(route)) issue('error', filePath(root, configPath), `${label} navigation page does not exist: ${entry}`);
    }
  };
  const i18n = config.i18n as Record<string, unknown> | undefined;
  if (i18n !== undefined) {
    if (!i18n || typeof i18n !== 'object' || typeof i18n.defaultLocale !== 'string' || !Array.isArray(i18n.locales)) {
      issue('error', filePath(root, configPath), 'i18n requires defaultLocale and locales');
    } else {
      const localeCodes = new Set<string>();
      for (const locale of i18n.locales) {
        if (!locale || typeof locale !== 'object' || typeof locale.code !== 'string' || !/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]+)*$/.test(locale.code)) {
          issue('error', filePath(root, configPath), 'Each locale needs a valid code');
          continue;
        }
        if (localeCodes.has(locale.code)) issue('error', filePath(root, configPath), `Duplicate locale code: ${locale.code}`);
        localeCodes.add(locale.code);
        variantIds.add(locale.code.toLowerCase());
        if (locale.code !== i18n.defaultLocale) checkVariant(locale.code.toLowerCase(), locale.navigation, `Locale ${locale.code}`);
      }
      if (!localeCodes.has(i18n.defaultLocale)) issue('error', filePath(root, configPath), 'defaultLocale must be listed in i18n.locales');
    }
  }
  if (config.versions !== undefined) {
    if (!Array.isArray(config.versions)) issue('error', filePath(root, configPath), 'versions must be an array');
    else for (const version of config.versions) {
      if (!version || typeof version !== 'object' || typeof version.label !== 'string') {
        issue('error', filePath(root, configPath), 'Each version needs a label');
        continue;
      }
      if (version.id !== undefined) {
        if (typeof version.id !== 'string' || !/^[\w.-]+$/.test(version.id)) {
          issue('error', filePath(root, configPath), 'Version id must be a path segment');
          continue;
        }
        if (variantIds.has(version.id.toLowerCase())) issue('error', filePath(root, configPath), `Version id conflicts with another prefix: ${version.id}`);
        variantIds.add(version.id.toLowerCase());
        checkVariant(version.id.toLowerCase(), version.navigation, `Version ${version.id}`);
      } else if (typeof version.url !== 'string') issue('error', filePath(root, configPath), 'Each version needs an id or url');
    }
  }

  const basePath = typeof config.basePath === 'string' ? `/${config.basePath.replace(/^\/+|\/+$/g, '')}` : '';
  for (const page of pages.values()) {
    const plain = withoutFences(page.body)
      .replace(/<!--[^]*?-->/g, '')
      .replace(/`+[^`\n]+`+/g, '');
    const markdown = plain.replace(/<[^>]*>/g, tag => '\n'.repeat(tag.split('\n').length - 1));
    const refs = [
      ...markdown.matchAll(/!?(?:\[[^\]]*\])\(([^\s)]+)(?:\s+[^)]*)?\)/g),
      ...plain.matchAll(/\b(?:href|src)=["']([^"']+)["']/g),
    ].map(match => ({ value: match[1], line: plain.slice(0, match.index).split('\n').length }));
    for (const ref of refs) {
      const value = ref.value.trim();
      if (!value || value === '#' || /^(?:[a-z][a-z\d+.-]*:|\/\/|\{)/i.test(value)) continue;
      let url: URL;
      try { url = new URL(value, 'https://dory.invalid'); } catch { continue; }
      let path = decodeURIComponent(value.split(/[?#]/, 1)[0] || '');
      if (basePath && (path === basePath || path.startsWith(`${basePath}/`))) path = path.slice(basePath.length) || '/';
      const targetRoute = value.startsWith('#') ? page.route : value.startsWith('/')
        ? (path.replace(/\/$/, '') || '/')
        : routeFor(resolve(dirname(page.file), path), contentRoot);
      const normalizedRoute = targetRoute.replace(/\.mdx$/, '').toLowerCase();
      const target = pages.get(normalizedRoute) || pages.get(`${normalizedRoute}/`);
      if (target) {
        if (url.hash && !target.anchors.has(decodeURIComponent(url.hash.slice(1)))) issue('error', filePath(root, page.file), `Missing anchor ${url.hash} in ${target.route}`, ref.line);
        continue;
      }
      const asset = value.startsWith('/') ? resolve(contentRoot, `.${path}`) : resolve(dirname(page.file), path);
      if (extname(path) && existsSync(asset)) continue;
      if (['/embed.js', '/embed-widget.js', '/llms.txt', '/llms-full.txt', '/sitemap.xml', '/robots.txt'].includes(path)) continue;
      issue('error', filePath(root, page.file), `Broken local link: ${value}`, ref.line);
    }
  }

  return { issues, pages: pages.size, errors: issues.filter(x => x.level === 'error').length, warnings: issues.filter(x => x.level === 'warning').length };
}

export function formatCheckResult(result: CheckResult): string {
  const lines = result.issues.map(issue => `${issue.level.toUpperCase()} ${issue.file}${issue.line ? `:${issue.line}` : ''}: ${issue.message}`);
  lines.push(`Checked ${result.pages} page${result.pages === 1 ? '' : 's'}: ${result.errors} error${result.errors === 1 ? '' : 's'}, ${result.warnings} warning${result.warnings === 1 ? '' : 's'}.`);
  return lines.join('\n');
}
