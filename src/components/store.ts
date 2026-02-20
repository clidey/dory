import type { ComponentType } from 'preact';
import { type RouteComponentProps } from 'wouter-preact';
import docsConfig from '../../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from '../types/config';
import { addToSearchIndex } from './search-index';

const config = docsConfig as DoryConfig;

// Eager-load all page modules so they're available synchronously.
// This eliminates the async loading spinner in Routes and enables
// proper hydrate() — the first render matches the SSR DOM.
export const ALL_PAGES = Object.fromEntries(
  Object.entries(import.meta.glob<{ default: ComponentType; }>('../../docs/**/*.mdx', { eager: true }))
    .map(([path, mod]) => [pathFromFilename(path), mod])
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


export let completeFrontMatter: Record<string, any>[] = [];
export function isFrontmatterReady() { return preloadedFrontMatter !== null; }
let preloadedFrontMatter: Record<string, any>[] | null = null;

// Check for inlined frontmatter from SSR (available synchronously, no fetch needed)
if (typeof window !== 'undefined' && (window as any).__DORY_FRONTMATTER__) {
    preloadedFrontMatter = (window as any).__DORY_FRONTMATTER__;
    completeFrontMatter = [...preloadedFrontMatter!];
    for (const fm of preloadedFrontMatter!) {
        updateNavigationTitle(fm.path, fm.title);
    }
    delete (window as any).__DORY_FRONTMATTER__;
    // Build search index in the background after the page has fully rendered
    setTimeout(() => addPreloadedContentToSearch(), 2000);
}

// Preload frontmatter from JSON file (fallback when no inline data)
export async function preloadFrontmatter() {
    if (preloadedFrontMatter) return; // Already loaded (inline or previous fetch)

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

                // Build search index in the background after the page has fully rendered.
                // Delay avoids competing with the route chunk for network connections.
                setTimeout(() => addPreloadedContentToSearch(), 2000);
            }
        }
    } catch (error) {
        console.warn('Failed to load prebuilt frontmatter JSON, falling back to dynamic loading:', error);
    }
}

// Add preloaded content to search index (runs in background, never blocks rendering).
// Fetches pre-built search-content.json generated at build time — no ?raw glob needed.
async function addPreloadedContentToSearch() {
    try {
        const response = await fetch('/search-content.json');
        if (!response.ok) return;
        const searchContent: Array<{ path: string; title: string; content: string }> = await response.json();

        for (const entry of searchContent) {
            try {
                await addToSearchIndex(entry.path, { title: entry.title }, entry.content);
            } catch (error) {
                console.warn(`Failed to index ${entry.path}:`, error);
            }
        }
    } catch (error) {
        console.warn('Failed to load search content:', error);
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

    // Fallback: fetch frontmatter.json for this page's metadata
    try {
        const response = await fetch('/frontmatter.json');
        if (response.ok) {
            const allFm: Record<string, any>[] = await response.json();
            const fm = allFm.find(f => f.path === pathname);
            if (fm) {
                updateNavigationTitle(pathname, fm.title);
                completeFrontMatter = [...completeFrontMatter, fm];
            }
        }
    } catch {
        // Non-fatal — page will still render, just without title in nav
    }
}

// Load all remaining frontmatter (after initial load) - optimized with fallback
export async function loadAllMDXFrontMatter(pathname: string) {
    if (preloadedFrontMatter) return;

    try {
        const response = await fetch('/frontmatter.json');
        if (!response.ok) return;
        const allFm: Record<string, any>[] = await response.json();

        for (const fm of allFm) {
            if (fm.path !== pathname) {
                updateNavigationTitle(fm.path, fm.title);
                completeFrontMatter = [...completeFrontMatter, fm];
            }
        }
    } catch {
        // Non-fatal
    }
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
