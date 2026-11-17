import type { Plugin } from 'vite';
import { readDoryConfig, getBasePath } from './shared.ts';

/** Discover bundled brand fonts in HTML rather than waiting for stylesheet parsing. */
export function fontPreloads(): Plugin {
  return {
    name: 'dory-font-preloads',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const config = readDoryConfig();
        if (!context.bundle || config?.fonts?.stylesheet || config?.fonts?.source) return [];
        const families = new Set([
          config?.fonts?.family ?? 'Hanken Grotesk',
          config?.fonts?.heading?.family ?? 'Bricolage Grotesque',
        ]);
        const brandFiles: Record<string, string> = {
          'Hanken Grotesk': 'HankenGrotesk-normal-latin-',
          'Bricolage Grotesque': 'BricolageGrotesque-normal-latin-',
        };
        return [...families].flatMap(family => {
          const prefix = brandFiles[family];
          if (!prefix) return [];
          const file = Object.values(context.bundle!).find(asset =>
            asset.type === 'asset' && asset.fileName.endsWith('.woff2') && asset.fileName.split('/').at(-1)?.startsWith(prefix));
          if (!file) return [];
          return [{ tag: 'link', attrs: {
            rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '',
            href: `${getBasePath(config)}/${file.fileName}`,
          }, injectTo: 'head' as const }];
        });
      },
    },
  };
}
