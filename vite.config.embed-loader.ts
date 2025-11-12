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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console for user feedback
        drop_debugger: true,
        pure_funcs: ['console.debug'],
      },
      mangle: {
        safari10: true,
      },
    },
  },
});
