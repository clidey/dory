import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

/** Standalone Dory MDX viewer shipped as static assets inside host applications. */
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  publicDir: false,
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  resolve: {
    dedupe: ['preact', 'preact/compat', 'preact/hooks', 'preact/jsx-runtime'],
    alias: { react: 'preact/compat', 'react-dom': 'preact/compat' },
  },
  build: {
    outDir: 'dist/runtime',
    emptyOutDir: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/embedded-runtime/index.tsx',
      name: 'DoryEmbeddedRuntime',
      formats: ['iife'],
      fileName: () => 'dory-runtime.js',
      cssFileName: 'dory-runtime',
    },
  },
});
