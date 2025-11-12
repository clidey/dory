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
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
      mangle: {
        safari10: true,
      },
    },
    rollupOptions: {
      output: {
        format: 'es',
        inlineDynamicImports: false,
      },
    },
  },
});
