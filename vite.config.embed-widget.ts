import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/embed/widget-iframe.ts'),
      name: '__DoryWidget__',
      fileName: () => 'embed-widget.js',
      formats: ['es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    // esbuild minification: works from the published package (terser is never
    // installed for consumers since it's only an optional peer of vite)
    minify: 'esbuild',
    rollupOptions: {
      output: {
        format: 'es',
        inlineDynamicImports: false,
      },
    },
  },
});
