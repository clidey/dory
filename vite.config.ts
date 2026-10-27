import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite'
import { unifiedMdxPreprocessor } from './src/plugins/unified-mdx-plugin.ts';
import { llmTxtGenerator } from './src/plugins/llm-txt-generator.ts';
import { llmTxtDevServer } from './src/plugins/llm-txt-dev-server.ts';
import { frontmatterGenerator } from './src/plugins/frontmatter-generator.ts';
import { frontmatterDevServer } from './src/plugins/frontmatter-dev-server.ts';
import { docsAssetsPlugin } from './src/plugins/docs-assets.ts';
import { htmlMetadataInjector } from './src/plugins/html-metadata-injector.ts';
import { htmlFilesMiddleware } from './src/plugins/html-files-middleware.ts';
import { analyticsInjector } from './src/plugins/analytics-injector.ts';
import { sitemapGenerator } from './src/plugins/sitemap-generator.ts';
import { robotsGenerator } from './src/plugins/robots-generator.ts';
import { prerender } from './src/plugins/prerender.ts';
import { getMdxConfig } from './src/config/mdx.ts';
import { getBasePath, readDoryConfig } from './src/plugins/shared.ts';

export default defineConfig(({ command }) => ({
  // Serve and build under `basePath` from dory.json (asset URLs, import.meta.env.BASE_URL).
  base: `${getBasePath(readDoryConfig())}/`,
  plugins: [
    // SINGLE SOURCE OF TRUTH: All MDX preprocessing happens in src/mdx/processor.ts
    htmlFilesMiddleware(), // Must be first to intercept HTML file requests
    unifiedMdxPreprocessor(),
    preact(),
    mdx(getMdxConfig(command === 'serve')),
    tailwindcss(),
    llmTxtGenerator(),
    llmTxtDevServer(),
    frontmatterGenerator(),
    frontmatterDevServer(),
    docsAssetsPlugin(),
    htmlMetadataInjector(),
    analyticsInjector(),
    sitemapGenerator(),
    robotsGenerator(),
    prerender(),
  ],
  resolve: {
    dedupe: ['preact', 'preact/compat', 'preact/hooks', 'preact/jsx-runtime', 'preact/compat/jsx-runtime'],
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    }
  },
  publicDir: false, // Don't use a public directory since we need to import from docs
  build: {
    rollupOptions: {
      output: {
        // Vite 8 (Rolldown) only supports the function form of manualChunks
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return;
          if (/node_modules\/preact($|\/)/.test(id)) return 'vendor-preact';
          if (id.includes('node_modules/@clidey/ux') || id.includes('node_modules/@headlessui/react')) return 'vendor-ui';
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';
          if (id.includes('node_modules/katex')) return 'katex';
          if (id.includes('node_modules/flexsearch')) return 'flexsearch';
        }
      }
    }
  },
  server: {
    // Vite's default host allowlist (DNS-rebinding protection) applies.
    // To serve behind a proxy with a custom hostname, add `server.allowedHosts`
    // in a local override or via Vite CLI flags.
    port: 3000,
    strictPort: false,
  },
  json: {
    stringify: false
  },
}));
