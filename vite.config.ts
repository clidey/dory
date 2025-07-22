import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite'
import remarkGfm from 'remark-gfm';
import { preprocessMdxTags, remarkSafeVars } from './src/plugins/sanitize';
import { llmTxtGenerator } from './src/plugins/llm-txt-generator';
import { llmTxtDevServer } from './src/plugins/llm-txt-dev-server';
import { frontmatterGenerator } from './src/plugins/frontmatter-generator';
import { frontmatterDevServer } from './src/plugins/frontmatter-dev-server';

export default defineConfig({
  plugins: [
    preprocessMdxTags(),
    preact(),
    mdx({
      providerImportSource: '@mdx-js/preact',
      remarkPlugins: [remarkGfm, remarkSafeVars],
    }),
    tailwindcss(),
    llmTxtGenerator(),
    llmTxtDevServer(),
    frontmatterGenerator(),
    frontmatterDevServer(),
  ],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat'
    }
  },
  publicDir: "docs",
  server: {
    allowedHosts: true,
  },
});
