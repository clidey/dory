import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite'
import remarkGfm from 'remark-gfm';
import { remarkSafeVars } from './src/plugins/sanitize';

export default defineConfig({
  plugins: [
    preact(),
    mdx({
      providerImportSource: '@mdx-js/preact',
      remarkPlugins: [remarkGfm, remarkSafeVars],
    }),
    tailwindcss(),
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
