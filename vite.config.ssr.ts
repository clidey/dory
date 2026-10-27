import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import mdx from '@mdx-js/rollup';
import { unifiedMdxPreprocessor } from './src/plugins/unified-mdx-plugin.ts';
import { getMdxConfig } from './src/config/mdx.ts';
import { getBasePath, readDoryConfig } from './src/plugins/shared.ts';

// Minimal Vite config for the SSR build.
// Only includes plugins needed for MDX compilation — no sitemap, prerender,
// analytics, or other build-time plugins that target the client output.
export default defineConfig({
  // Must match vite.config.ts so SSR markup uses the same base-prefixed URLs.
  base: `${getBasePath(readDoryConfig())}/`,
  plugins: [
    unifiedMdxPreprocessor(),
    preact(),
    mdx(getMdxConfig(false)),
  ],
  resolve: {
    dedupe: ['preact', 'preact/compat', 'preact/hooks', 'preact/jsx-runtime', 'preact/compat/jsx-runtime'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    }
  },
  build: {
    ssr: 'src/entry-server.tsx',
    outDir: 'dist-ssr',
  },
  ssr: {
    // Bundle all dependencies so preact/compat aliases resolve correctly.
    // Without this, externalized imports like @headlessui/react would
    // import 'react' directly, bypassing the preact alias.
    noExternal: true,
  },
});
