import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite'
import { preprocessMdxTags } from './src/plugins/sanitize';
import { llmTxtGenerator } from './src/plugins/llm-txt-generator';
import { llmTxtDevServer } from './src/plugins/llm-txt-dev-server';
import { frontmatterGenerator } from './src/plugins/frontmatter-generator';
import { frontmatterDevServer } from './src/plugins/frontmatter-dev-server';
import { getMdxConfig } from './src/config/mdx';

export default defineConfig({
  plugins: [
    preprocessMdxTags(),
    preact(),
    mdx(getMdxConfig()),
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
