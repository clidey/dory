import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';

/**
 * Shared helpers for build plugins that read docs/*.mdx and docs/dory.json.
 * Consolidated from near-identical copies in frontmatter-generator,
 * frontmatter-dev-server, llm-txt-generator, and llm-txt-dev-server.
 */

/**
 * Parses YAML frontmatter from MDX content using gray-matter.
 * Handles CRLF line endings and real YAML (nested values, dates, quotes).
 */
export function parseFrontmatter(content: string): { data: Record<string, any>; content: string } {
  const parsed = matter(content);
  return { data: parsed.data, content: parsed.content };
}

/**
 * Reads and parses docs/dory.json. Returns null when the file is missing
 * or unparseable (a parse error is logged).
 */
export function readDoryConfig(docsDir?: string): Record<string, any> | null {
  const doryJsonPath = path.join(docsDir || path.join(process.cwd(), 'docs'), 'dory.json');
  if (!fs.existsSync(doryJsonPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(doryJsonPath, 'utf-8'));
  } catch (error) {
    const detail = error instanceof SyntaxError ? error.message : String(error);
    console.error(`Failed to parse ${doryJsonPath}: ${detail}`);
    return null;
  }
}

/**
 * Reads dory.json navigation and returns the flat, ordered list of page keys.
 */
export function getNavigationOrder(docsDir: string): string[] {
  const doryJson = readDoryConfig(docsDir);
  if (!doryJson) return [];
  const order: string[] = [];

  function walkPages(pages: any[]) {
    for (const page of pages) {
      if (typeof page === 'string') {
        order.push(page);
      } else if (typeof page === 'object' && page.pages) {
        walkPages(page.pages);
      }
    }
  }

  if (doryJson.navigation && Array.isArray(doryJson.navigation.tabs)) {
    for (const tab of doryJson.navigation.tabs) {
      if (tab.groups && Array.isArray(tab.groups)) {
        for (const group of tab.groups) {
          if (group.pages && Array.isArray(group.pages)) {
            walkPages(group.pages);
          }
        }
      }
    }
  }
  return order;
}

/**
 * Converts an MDX filename to the route path used by the store,
 * e.g. docs/getting-started/installation.mdx -> /getting-started/installation.
 */
export function pathFromFilename(filename: string, docsDir: string): string {
  return filename
    .replace(docsDir, '')
    .replace(/\/?index\.mdx$/, '/')
    .replace(/\.mdx$/, '')
    .replace(/\\/g, '/')
    .toLowerCase();
}

/**
 * Recursively finds all MDX files under a directory, keyed by relative
 * path without the .mdx extension (forward slashes).
 */
export function findMdxFilesMap(dir: string, baseDir: string): Record<string, string> {
  const files: Record<string, string> = {};
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      Object.assign(files, findMdxFilesMap(fullPath, baseDir));
    } else if (item.isFile() && item.name.endsWith('.mdx')) {
      let rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      if (rel.endsWith('.mdx')) rel = rel.slice(0, -4);
      files[rel] = fullPath;
    }
  }

  return files;
}

/**
 * Strips MDX/JSX syntax to extract plain text (for search indexing and
 * meta description fallbacks).
 */
export function stripMdxToText(content: string): string {
  return content
    .replace(/^import\s+.*$/gm, '')           // import statements
    .replace(/^export\s+.*$/gm, '')           // export statements
    .replace(/```[\s\S]*?```/g, '')           // fenced code blocks
    .replace(/<[^>]+>/g, '')                  // JSX/HTML tags
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')  // markdown links -> text
    .replace(/[#*_~`>|]/g, '')                // markdown syntax chars
    .replace(/\n{3,}/g, '\n\n')               // collapse blank lines
    .trim();
}

/**
 * Escapes a string for safe use in HTML/XML text and attribute values.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Applies an seo.titleTemplate (e.g. "%s — Site") to a page title.
 * Returns the title unchanged when no template is set or the title is
 * already the bare site title.
 */
export function applyTitleTemplate(title: string, template: string | undefined, siteName: string): string {
  if (!template || title === siteName) return title;
  return template.replace('%s', title);
}
