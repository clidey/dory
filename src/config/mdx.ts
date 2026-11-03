import { getCommonMdxConfig } from './mdx-common.ts';
import { remarkRelativeAssets } from '../plugins/relative-assets.ts';

/**
 * Shared MDX configuration used by the main build (vite.config.ts),
 * the SSR build (vite.config.ssr.ts), and the CLI build:file command
 * (bin/dory.js). rehype-slug adds stable ids to headings so anchors
 * match between SSR output and client hydration. rehype-code-meta keeps
 * code fence meta (filename, highlighted lines) for the code components.
 * remark-relative-assets turns relative image paths into root paths so they
 * work on pages served with a trailing slash.
 */
export const getMdxConfig = (isDevelopment: boolean = false) => {
  const common = getCommonMdxConfig(isDevelopment);
  return {
    providerImportSource: '@mdx-js/preact',
    ...common,
    remarkPlugins: [...common.remarkPlugins, remarkRelativeAssets],
  };
};
