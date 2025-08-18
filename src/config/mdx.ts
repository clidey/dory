import remarkGfm from 'remark-gfm';
import { remarkSafeVars } from '../plugins/sanitize';

/**
 * Shared MDX configuration used by both main build (vite.config.ts) 
 * and CLI build:file command (bin/dory.js)
 */
export const getMdxConfig = (isDevelopment: boolean = false) => ({
  providerImportSource: '@mdx-js/preact',
  remarkPlugins: [remarkGfm, remarkSafeVars],
  development: isDevelopment,
});