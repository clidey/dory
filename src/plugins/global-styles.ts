import { resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';
import { resolveStylesheets, validateStylesheetDependencies } from '../../bin/styles.ts';
import { readDoryConfig } from './shared.ts';

const moduleId = 'virtual:dory-styles';
const resolvedId = `\0${moduleId}`;

/** Loads configured site styles after Dory's defaults through Vite's CSS pipeline. */
export function globalStylesPlugin(): Plugin {
  const docsDir = resolve(process.cwd(), 'docs');
  const configPath = normalizePath(resolve(docsDir, 'dory.json'));
  const stylesheets = new Set<string>();
  return {
    name: 'dory-global-styles',
    enforce: 'pre',
    resolveId(id) {
      if (id === moduleId) return resolvedId;
    },
    load(id) {
      if (id !== resolvedId) return;
      this.addWatchFile(configPath);
      stylesheets.clear();
      return resolveStylesheets(readDoryConfig(docsDir)?.styles, docsDir)
        .map(file => {
          for (const dependency of validateStylesheetDependencies(file, docsDir).stylesheets) stylesheets.add(normalizePath(dependency));
          return file;
        })
        .map(file => `import ${JSON.stringify(normalizePath(file))};`).join('\n');
    },
    transform(_code, id) {
      const file = normalizePath(id.split('?', 1)[0]);
      if (!stylesheets.has(file)) return;
      // Revalidate before each CSS transform, including edits after initial load.
      const dependencies = validateStylesheetDependencies(file, docsDir);
      for (const dependency of dependencies.stylesheets) {
        stylesheets.add(normalizePath(dependency));
        this.addWatchFile(dependency);
      }
      for (const asset of dependencies.assets) this.addWatchFile(asset);
    },
    handleHotUpdate(context) {
      if (context.file !== configPath) return;
      const module = context.server.moduleGraph.getModuleById(resolvedId);
      if (module) context.server.moduleGraph.invalidateModule(module);
      context.server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}
