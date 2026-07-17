import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: resolve(__dirname, 'src/embed/loader.ts'),
      output: {
        entryFileNames: 'embed.js',
        format: 'iife',
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
    // esbuild minification: works from the published package (terser is never
    // installed for consumers since it's only an optional peer of vite)
    minify: 'esbuild',
  },
});
