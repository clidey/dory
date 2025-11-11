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
import { getMdxConfig } from './src/config/mdx';

export default defineConfig(({ command }) => ({
  plugins: [
    // SINGLE SOURCE OF TRUTH: All MDX preprocessing happens in src/mdx/processor.ts
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
  ],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat'
    }
  },
  publicDir: false, // Don't use a public directory since we need to import from docs
  server: {
    allowedHosts: true,
    port: 3000,
    strictPort: false,
  },
  json: {
    stringify: false
  },
}));
