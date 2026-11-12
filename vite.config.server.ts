import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Bundle the serving dependencies; the runtime image needs only Node and site files.
export default defineConfig({
  define: {
    __DORY_VERSION__: JSON.stringify(JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version),
  },
  build: {
    ssr: 'bin/preview-entry.ts',
    outDir: 'dist-server',
    rolldownOptions: { output: { entryFileNames: 'server.js', codeSplitting: false } },
  },
  ssr: { noExternal: true, external: ['playwright-core'] },
});
