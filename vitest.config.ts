import { defineConfig } from 'vitest/config';

// Standalone vitest config so unit tests don't load vite.config.ts
// (which boots the full docs-site plugin pipeline).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
