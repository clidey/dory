import type { Plugin } from 'vite';
import { cpSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, extname } from 'path';

/**
 * Plugin to copy docs assets to the build output
 * Since we can't use publicDir for docs (we need to import from it),
 * this plugin manually copies asset files during build
 */
export function docsAssetsPlugin(): Plugin {
  return {
    name: 'docs-assets',
    apply: 'build', // Only run during build
    closeBundle() {
      const docsDir = resolve(process.cwd(), 'docs');
      const outDir = resolve(process.cwd(), 'dist');

      if (!existsSync(docsDir)) {
        console.warn('[docs-assets] docs directory not found, skipping asset copy');
        return;
      }

      // Define asset extensions to copy
      const assetExtensions = new Set([
        '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
        '.pdf', '.mp4', '.webm', '.mp3', '.wav',
        '.woff', '.woff2', '.ttf', '.eot',
      ]);

      // Define file/folder patterns to skip
      const skipPatterns = new Set([
        'dory.json',
        'node_modules',
        '.DS_Store',
      ]);

      const shouldSkip = (name: string) => {
        if (skipPatterns.has(name)) return true;
        const ext = extname(name).toLowerCase();
        // Skip MDX and JSON files (they're processed by Vite)
        if (ext === '.mdx' || ext === '.md' || ext === '.json') return true;
        return false;
      };

      const copyAssets = (srcDir: string, destDir: string, relativePath: string = '') => {
        const items = readdirSync(srcDir);

        for (const item of items) {
          if (shouldSkip(item)) continue;

          const srcPath = resolve(srcDir, item);
          const destPath = resolve(destDir, item);
          const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;

          try {
            const stats = statSync(srcPath);

            if (stats.isDirectory()) {
              // Recursively copy directories
              copyAssets(srcPath, destPath, itemRelativePath);
            } else if (stats.isFile()) {
              const ext = extname(item).toLowerCase();
              // Copy if it's an asset file
              if (assetExtensions.has(ext)) {
                cpSync(srcPath, destPath, { force: true });
                console.log(`[docs-assets] Copied ${itemRelativePath}`);
              }
            }
          } catch (error) {
            console.warn(`[docs-assets] Failed to copy ${itemRelativePath}:`, error);
          }
        }
      };

      console.log('[docs-assets] Copying assets from docs to dist...');
      copyAssets(docsDir, outDir);
    },
  };
}
