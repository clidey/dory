import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite'
import remarkGfm from 'remark-gfm';
import { remarkSafeVars } from './src/plugins/sanitize';
import { remarkJsxWhitespaceFix } from './src/plugins/remark-jsx-whitespace-fix';
import { llmTxtGenerator } from './src/plugins/llm-txt-generator';
import { llmTxtDevServer } from './src/plugins/llm-txt-dev-server';

export default defineConfig({
  plugins: [
    preact(),
    mdx({
      providerImportSource: '@mdx-js/preact',
      remarkPlugins: [remarkJsxWhitespaceFix, remarkGfm, remarkSafeVars],
    }),
    tailwindcss(),
    llmTxtGenerator(),
    llmTxtDevServer(),
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
