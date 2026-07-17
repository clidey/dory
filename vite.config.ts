import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite'
import { unifiedMdxPreprocessor } from './src/plugins/unified-mdx-plugin';
import { llmTxtGenerator } from './src/plugins/llm-txt-generator';
import { llmTxtDevServer } from './src/plugins/llm-txt-dev-server';
import { frontmatterGenerator } from './src/plugins/frontmatter-generator';
import { frontmatterDevServer } from './src/plugins/frontmatter-dev-server';
import { docsAssetsPlugin } from './src/plugins/docs-assets';
import { htmlMetadataInjector } from './src/plugins/html-metadata-injector';
import { htmlFilesMiddleware } from './src/plugins/html-files-middleware';
import { analyticsInjector } from './src/plugins/analytics-injector';
import { sitemapGenerator } from './src/plugins/sitemap-generator';
import { robotsGenerator } from './src/plugins/robots-generator';
import { prerender } from './src/plugins/prerender';
import { getMdxConfig } from './src/config/mdx';

export default defineConfig(({ command }) => ({
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
