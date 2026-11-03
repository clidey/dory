import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { renderSocialPreview, socialPreviewPath, wrapSocialText } from './social-preview';

const folders: string[] = [];
afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }); });

test('image paths distinguish nested routes and cannot escape the output directory', () => {
  expect(socialPreviewPath('/guide/start')).not.toBe(socialPreviewPath('/reference/start'));
  expect(socialPreviewPath('/../../private')).toMatch(/^\/_dory\/social\/page-[a-f0-9]+\.png$/);
});

test('long titles wrap into bounded lines without cutting Unicode characters', () => {
  const lines = wrapSocialText('A'.repeat(200), 30, 3);
  expect(lines).toHaveLength(3);
  expect(lines.every(line => Array.from(line).length <= 30)).toBe(true);
  expect(lines[2]).toMatch(/…$/);
  expect(wrapSocialText('😀'.repeat(12), 6, 2)).toEqual(['😀'.repeat(6), '😀'.repeat(6)]);
});

test('renders distinct 1200 by 630 PNGs with no system font or browser dependency', () => {
  const root = mkdtempSync(resolve(tmpdir(), 'dory-social-'));
  folders.push(root);
  const docsDir = resolve(root, 'docs');
  mkdirSync(docsDir);
  const options = { config: { name: 'Example & Docs' }, docsDir, outDir: root, description: 'A guide for your team.' };
  const first = renderSocialPreview({ ...options, route: '/install', title: 'Installation' });
  const second = renderSocialPreview({ ...options, route: '/start', title: 'Getting started <safely>' });
  const png = readFileSync(resolve(root, first.slice(1)));
  expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  expect(png).not.toEqual(readFileSync(resolve(root, second.slice(1))));
});

test('page overrides and shared-image opt-out produce correct base-prefixed metadata', async () => {
  const { prerender } = await import('./prerender');
  const { vi } = await import('vitest');
  const { copyFileSync, writeFileSync } = await import('node:fs');
  const root = mkdtempSync(resolve(tmpdir(), 'dory-social-metadata-'));
  folders.push(root);
  const dist = resolve(root, 'dist');
  mkdirSync(resolve(root, 'docs'), { recursive: true });
  mkdirSync(resolve(root, 'src/assets/fonts'), { recursive: true });
  mkdirSync(dist);
  copyFileSync(resolve('src/assets/fonts/HankenGrotesk.ttf'), resolve(root, 'src/assets/fonts/HankenGrotesk.ttf'));
  const config = { name: 'Example', url: 'https://docs.example.com', basePath: '/manual', image: '/shared.png', navigation: { tabs: [] } };
  const template = '<html lang="en"><head><title>Docs</title><meta name="description" content="" /><meta property="og:image" content="" /><meta name="twitter:image" content="" /><meta name="twitter:card" content="summary" /></head><body><div id="app"></div></body></html>';
  writeFileSync(resolve(dist, 'frontmatter.json'), JSON.stringify([
    { path: '/start', title: 'Start', description: 'Get started.' },
    { path: '/custom', title: 'Custom', description: 'Custom page.', image: '/art/custom.png' },
  ]));
  const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root);
  try {
    for (const enabled of [true, false]) {
      writeFileSync(resolve(root, 'docs/dory.json'), JSON.stringify({ ...config, seo: { generateSocialImages: enabled } }));
      writeFileSync(resolve(dist, 'index.html'), template);
      const hooks = prerender() as { configResolved(config: unknown): void; closeBundle(): void };
      hooks.configResolved({ build: { outDir: dist } });
      hooks.closeBundle();
      const start = readFileSync(resolve(dist, 'start/index.html'), 'utf8');
      const custom = readFileSync(resolve(dist, 'custom/index.html'), 'utf8');
      const image = enabled ? socialPreviewPath('/start') : '/shared.png';
      expect(start).toContain(`content="https://docs.example.com/manual${image}"`);
      expect(custom).toContain('content="https://docs.example.com/manual/art/custom.png"');
      if (enabled) expect(readFileSync(resolve(dist, image.slice(1))).readUInt32BE(16)).toBe(1200);
    }
  } finally { cwd.mockRestore(); }
});
