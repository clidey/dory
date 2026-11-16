import { createRequire } from 'node:module';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import postcss from 'postcss';
import type { DoryConfig } from '../types/config.ts';

const require = createRequire(import.meta.url);
const uxRoot = resolve(dirname(require.resolve('@clidey/ux/brand.css')), '..');
const brand = postcss.parse(readFileSync(resolve(uxRoot, 'dist/brand.css'), 'utf8'));

/** Read defaults from the same UX tokens the docs use, so UX updates stay in sync. */
export function socialTheme(config: Partial<DoryConfig>) {
  const mode = config.seo?.socialImageTheme || (config.theme?.mode === 'dark' ? 'dark' : 'light');
  const tokens: Record<string, string> = {};
  for (const selector of mode === 'dark' ? [':root', '.dark'] : [':root']) {
    brand.walkRules(selector, rule => { rule.walkDecls(decl => { tokens[decl.prop] = decl.value; }); });
  }
  const color = (value: string | undefined, fallback: string) => {
    // CSS3 colors understood by SVG; reject CSS references and markup.
    return value && /^(?:#[a-f\d]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+\-/]+\)|[a-z]+)$/i.test(value) ? value : fallback;
  };
  return {
    mode,
    background: color(config.colors?.background, tokens['--background']),
    foreground: color(config.colors?.foreground, tokens['--foreground']),
    muted: color(config.colors?.mutedForeground, tokens['--muted-foreground']),
    primary: color(config.colors?.[mode] || config.colors?.primary, tokens['--primary']),
    border: color(config.colors?.border, tokens['--border']),
  };
}

const decodedFonts = new Map<string, Promise<string>>();
let fontDir: string;
let decodeQueue: Promise<unknown> = Promise.resolve();
process.once('exit', () => { if (fontDir) rmSync(fontDir, { recursive: true, force: true }); });

/** resvg's native renderer needs SFNT fonts. Decode UX's WOFF2 once per build. */
async function rendererFont(file: string): Promise<string> {
  if (extname(file).toLowerCase() !== '.woff2') return file;
  let pending = decodedFonts.get(file);
  if (!pending) {
    pending = decodeQueue.then(async () => {
      const { default: decompress } = await import('wawoff2/decompress.js');
      // The decoder returns a view into shared WASM memory. Copy before another
      // decode can overwrite it, and serialize decodes across all font families.
      const bytes = Buffer.from(await decompress(readFileSync(file)));
      fontDir ||= mkdtempSync(resolve(tmpdir(), 'dory-social-fonts-'));
      const target = resolve(fontDir, `${createHash('sha256').update(file).digest('hex')}.ttf`);
      writeFileSync(target, bytes);
      return target;
    });
    decodeQueue = pending.catch(() => undefined);
    decodedFonts.set(file, pending);
  }
  return pending;
}

const uxFontCatalog = new Map<string, string[]>();
postcss.parse(readFileSync(resolve(uxRoot, 'themes/fonts.css'), 'utf8')).walkAtRules('font-face', rule => {
  let family = '';
  let source = '';
  rule.walkDecls(decl => {
    if (decl.prop === 'font-family') family = decl.value.replace(/['"]/g, '').trim();
    if (decl.prop === 'src') source = decl.value.match(/url\(['"]?([^)'"]+)/)?.[1] || '';
  });
  if (family && source) uxFontCatalog.set(family, [...(uxFontCatalog.get(family) || []), resolve(uxRoot, 'themes', source)]);
});

export const uxFontFamilies = [...uxFontCatalog.keys()];

/** CSS aliases can differ from embedded font names (notably Bricolage). */
export function embeddedFontFamily(file: string): string {
  const bytes = readFileSync(file);
  for (let index = 0; index < bytes.readUInt16BE(4); index++) {
    const record = 12 + index * 16;
    if (bytes.toString('ascii', record, record + 4) !== 'name') continue;
    const table = bytes.readUInt32BE(record + 8);
    const strings = table + bytes.readUInt16BE(table + 4);
    const names = new Map<number, string>();
    for (let entry = 0; entry < bytes.readUInt16BE(table + 2); entry++) {
      const offset = table + 6 + entry * 12;
      const platform = bytes.readUInt16BE(offset), id = bytes.readUInt16BE(offset + 6);
      if (![1, 16].includes(id) || ![0, 3].includes(platform)) continue;
      const start = strings + bytes.readUInt16BE(offset + 10), length = bytes.readUInt16BE(offset + 8);
      let value = '';
      for (let position = start; position < start + length; position += 2) value += String.fromCharCode(bytes.readUInt16BE(position));
      names.set(id, value);
    }
    return names.get(16) || names.get(1) || '';
  }
  return '';
}

export async function socialFonts(config: Partial<DoryConfig>, local: (source?: string) => string | undefined) {
  const definitions = [
    { family: config.fonts?.family || 'Hanken Grotesk', source: config.fonts?.source },
    { family: config.fonts?.heading?.family || 'Bricolage Grotesque', source: config.fonts?.heading?.source },
    { family: config.fonts?.mono?.family || 'JetBrains Mono', source: config.fonts?.mono?.source },
  ];
  const defaults = ['Hanken Grotesk', 'Bricolage Grotesque', 'JetBrains Mono'];
  const fonts = definitions.map((definition, index) => {
    const source = local(definition.source);
    const custom = source && /\.(ttf|otf|woff2)$/i.test(source) ? source : undefined;
    const bundled = uxFontCatalog.get(definition.family);
    return { family: custom || bundled ? definition.family : defaults[index], files: custom ? [custom] : bundled || uxFontCatalog.get(defaults[index])! };
  });
  const resolved = await Promise.all(fonts.map(async font => ({ family: font.family, files: await Promise.all(font.files.map(rendererFont)) })));
  const families = resolved.map(font => embeddedFontFamily(font.files[0]) || font.family);
  return { body: families[0], heading: families[1], mono: families[2], files: [...new Set(resolved.flatMap(font => font.files))] };
}
