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
import { cspGenerator } from './src/plugins/csp-generator';
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
    cspGenerator(),
    sitemapGenerator(),
    robotsGenerator(),
    prerender(),
  ],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat'
    }
  },
  publicDir: false, // Don't use a public directory since we need to import from docs
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-preact': ['preact', 'preact/compat', 'preact/hooks'],
          'vendor-ui': ['@clidey/ux', '@headlessui/react'],
          'vendor-icons': ['lucide-react'],
          'katex': ['katex'],
          'flexsearch': ['flexsearch'],
        }
      }
    }
  },
  server: {
    allowedHosts: true,
    port: 3000,
    strictPort: false,
  },
  json: {
    stringify: false
  },
}));
