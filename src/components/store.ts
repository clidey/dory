import type { ComponentType } from 'preact';
import { type RouteComponentProps } from 'wouter-preact';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { addToSearchIndex } from './search-index';

const config = docsConfig as DoryConfig;

export const ALL_PAGES = Object.fromEntries(
  Object.entries(import.meta.glob<{ default: ComponentType; }>('../../docs/**/*.mdx'))
    .map(([path, loader]) => [pathFromFilename(path), loader])
);
export const ALL_OPENAPI = Object.fromEntries(
  Object.entries(import.meta.glob<{ default: string }>('../../docs/**/openapi.json', { query: 'raw', eager: true }))
    .map(([path, loader]) => [pathFromFilename(path), loader])
);
export const ALL_ASYNCAPI = Object.fromEntries(
  Object.entries(import.meta.glob<{ default: string }>('../../docs/**/asyncapi.json', { query: 'raw', eager: true }))
    .map(([path, loader]) => [pathFromFilename(path), loader])
);

export interface Route {
    path: string;
    component: ComponentType<RouteComponentProps<{ [param: number]: string | undefined; }>>;
    title?: string;
    description?: string;
}

export interface Navigation {
    title: string;
    groups: Array<{
        title: string;
        pages: Array<{
            title: string;
            href: string;
        }>;
    }>;
}

export const ALL_NAVIGATION: Navigation[] = config.navigation.tabs.map(tab => ({
    title: tab.tab,
    groups: tab.groups.map(group => ({
      title: group.group,
      pages: group.pages.map(page => {
        const path = `/${page}`;
        return {
          title: page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' '),
          href: path
        };
      })
    }))
}));

export function pathFromFilename(filename: string): string {
    return filename
        .replace('../../docs', '')
        .replace(/\/?index\.mdx$/, '/')
        .replace(/\.mdx$/, '')
        .toLowerCase();
}

function parseFrontMatter(content: string) {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) return { data: {}, content };
    
    const frontMatter = frontMatterMatch[1];
    const data: Record<string, any> = {};
    
    frontMatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
        const value = valueParts.join(':').trim();
        data[key.trim()] = value.replace(/^["']|["']$/g, ''); // Remove quotes if present
        }
    });

    return { data, content: content.slice(frontMatterMatch[0].length) };
}

export let completeFrontMatter: Record<string, any>[] = [];
let preloadedFrontMatter: Record<string, any>[] | null = null;

// Preload frontmatter from JSON file (optimized approach)
export async function preloadFrontmatter() {
    if (preloadedFrontMatter) return; // Already loaded

    try {
        const response = await fetch('/frontmatter.json');
        if (response.ok) {
            preloadedFrontMatter = await response.json();
            if (preloadedFrontMatter) {
                completeFrontMatter = [...preloadedFrontMatter];

                // Update navigation titles from preloaded data
                for (const fm of preloadedFrontMatter) {
                    updateNavigationTitle(fm.path, fm.title);
                }

                // Build search index in the background — don't block page rendering.
                // Each page's raw MDX is fetched individually, so for large sites this
                // can be hundreds of requests. We batch them to avoid overwhelming the
                // browser's connection pool.
                addPreloadedContentToSearch();
            }
        }
    } catch (error) {
        console.warn('Failed to load prebuilt frontmatter JSON, falling back to dynamic loading:', error);
    }
}

// Add preloaded content to search index (runs in background, never blocks rendering)
async function addPreloadedContentToSearch() {
    if (!preloadedFrontMatter) return;

    const mdxFiles = import.meta.glob<{ default: string }>('../../docs/**/*.mdx', { query: '?raw' });
    const fileEntries = Object.entries(mdxFiles);

    // Index in batches to avoid firing hundreds of requests at once
    const BATCH_SIZE = 10;
    for (let i = 0; i < preloadedFrontMatter.length; i += BATCH_SIZE) {
        const batch = preloadedFrontMatter.slice(i, i + BATCH_SIZE);
        await Promise.all(
            batch.map(async (fm) => {
                const fileEntry = fileEntries.find(([filePath]) => pathFromFilename(filePath) === fm.path);
                if (fileEntry) {
                    try {
                        const [, loader] = fileEntry;
                        const rawContent = (await loader()).default;
                        const { content } = parseFrontMatter(rawContent);

                        await addToSearchIndex(fm.path, { title: fm.title }, content);
                    } catch (error) {
                        console.warn(`Failed to index ${fm.path}:`, error);
                    }
                }
            })
        );
    }
}

// Load frontmatter for a specific pathname (optimized with fallback)
export async function loadMDXFrontMatterForPath(pathname: string) {
    // If we have preloaded data, check if this path is already loaded
    if (preloadedFrontMatter && preloadedFrontMatter.find(fm => fm.path === pathname)) {
        return;
    }
    
    // Check if already loaded in completeFrontMatter
    if (completeFrontMatter.find(fm => fm.path === pathname)) return;

    // Fallback to dynamic loading
    const mdxFiles = import.meta.glob<{ default: string }>('../../docs/**/*.mdx', { query: '?raw' });
    const fileEntries = Object.entries(mdxFiles);

    const fileEntry = fileEntries.find(([path]) => pathFromFilename(path) === pathname);
    if (!fileEntry) return;

    const [path, loader] = fileEntry;
    const rawContent = (await loader()).default;
    const { data, content } = parseFrontMatter(rawContent);
    const filename = pathFromFilename(path);

    updateNavigationTitle(filename, data.title);
    await addToSearchIndex(filename, data, content);

    const frontmatterItem = { ...data, path: filename };
    completeFrontMatter = [...completeFrontMatter, frontmatterItem];
}

// Load all remaining frontmatter (after initial load) - optimized with fallback
export async function loadAllMDXFrontMatter(pathname: string) {
    // If we have preloaded data, we're already done
    if (preloadedFrontMatter) {
        return;
    }

    // Fallback to dynamic loading
    const mdxFiles = import.meta.glob<{ default: string }>('../../docs/**/*.mdx', { query: '?raw' });
    const fileEntries = Object.entries(mdxFiles);

    const remainingEntries = fileEntries.filter(([path]) => pathFromFilename(path) !== pathname);
    const newFrontmatter: Record<string, any>[] = [];

    await Promise.all(
        remainingEntries.map(async ([path, loader]) => {
            const rawContent = (await loader()).default;
            const { data, content } = parseFrontMatter(rawContent);
            const filename = pathFromFilename(path);

            updateNavigationTitle(filename, data.title);
            await addToSearchIndex(filename, data, content);

            newFrontmatter.push({ ...data, path: filename });
        })
    );

    completeFrontMatter = [...completeFrontMatter, ...newFrontmatter];
}

// Shared helper
function updateNavigationTitle(filename: string, title?: string) {
    if (!title) return;

    for (const tab of ALL_NAVIGATION) {
        for (const group of tab.groups) {
            for (const page of group.pages) {
                if (page.href === filename) {
                    page.title = title;
                }
            }
        }
    }
}
