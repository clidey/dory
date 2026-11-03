import { defineConfig } from 'vite';

// Bundle the serving dependencies; the runtime image needs only Node and site files.
export default defineConfig({
  build: {
    ssr: 'bin/preview-entry.ts',
    outDir: 'dist-server',
    rolldownOptions: { output: { entryFileNames: 'server.js', codeSplitting: false } },
  },
  ssr: { noExternal: true, external: ['playwright-core'] },
});
