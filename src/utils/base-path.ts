/// <reference types="vite/client" />

/**
 * Normalizes a configured base path to "" (site served at the origin root) or
 * "/segment[/more]" with a leading slash and no trailing slash. Accepts
 * "docs", "/docs", "/docs/" and "/" interchangeably; non-strings yield "".
 */
export function normalizeBasePath(value: unknown): string {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '';
}

/**
 * Prefixes a root-relative path ("/x") with `base`. Protocol URLs,
 * protocol-relative URLs, anchors and paths already under `base` are
 * returned unchanged.
 */
export function joinBasePath(base: string, path: string): string {
  if (!base || !path.startsWith('/') || path.startsWith('//')) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}

/**
 * The base path the site is served under, from Vite's `base` (which the
 * configs derive from `basePath` in dory.json). "" when served at the root.
 */
export const BASE_PATH = normalizeBasePath(
  typeof import.meta.env !== 'undefined' ? import.meta.env.BASE_URL : ''
);

/** Prefixes a root-relative path with the configured base path. */
export function withBase(path: string): string {
  return joinBasePath(BASE_PATH, path);
}

/** Resolves a dory.json asset path such as "./logo/logo.png" to a site URL. */
export function assetUrl(path: string): string {
  return withBase(`/${path.replace(/^\.?\/*/, '')}`);
}
