import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { remarkSafeVars } from '../plugins/sanitize.ts';

/**
 * Shared MDX configuration used by the main build (vite.config.ts),
 * the SSR build (vite.config.ssr.ts), and the CLI build:file command
 * (bin/dory.js). rehype-slug adds stable ids to headings so anchors
 * match between SSR output and client hydration.
 */
export const getMdxConfig = (isDevelopment = false) => ({
  providerImportSource: '@mdx-js/preact',
  remarkPlugins: [remarkGfm, remarkSafeVars],
  rehypePlugins: [rehypeSlug],
  development: isDevelopment,
});
