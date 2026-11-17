import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { DoryConfig } from '../types/config.ts';
import { escapeHtml } from './shared.ts';
import { notFoundSocialImage } from '../utils/seo.ts';
import { socialFonts, socialTheme } from './social-theme.ts';

export function socialPreviewPath(route: string): string {
  if (route === '/404') return notFoundSocialImage;
  return route === '/' ? '/_dory/social/home.png' : `/_dory/social/page-${createHash('sha256').update(route).digest('hex').slice(0, 20)}.png`;
}

function localAsset(docsDir: string, source?: string): string | undefined {
  if (!source || /^(?:[a-z]+:|\/\/)/i.test(source)) return;
  const file = resolve(docsDir, source.replace(/^\.?\//, ''));
  if (!existsSync(file)) return;
  const rel = relative(realpathSync(docsDir), realpathSync(file));
  if (rel.startsWith('..') || isAbsolute(rel)) return;
  return file;
}

/** Bounded lines, including long words and titles without spaces. */
export function wrapSocialText(text: string, columns: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    if (line && Array.from(`${line} ${word}`).length > columns) { lines.push(line); line = ''; }
    const characters = Array.from(word);
    while (characters.length > columns) {
      if (line) { lines.push(line); line = ''; }
      lines.push(characters.splice(0, columns).join(''));
    }
    const tail = characters.join('');
    if (tail) line = line ? `${line} ${tail}` : tail;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = `${Array.from(lines[maxLines - 1]).slice(0, columns - 1).join('').trimEnd()}…`;
  }
  return lines;
}

type PreviewOptions = { route: string; title: string; description: string; config: Partial<DoryConfig>; docsDir: string; outDir: string };

/** Editorial card using the same UX palette and font files as the documentation. */
export async function socialPreviewSvg({ title, description, config, docsDir }: PreviewOptions) {
  const name = config.name || 'Documentation';
  const theme = socialTheme(config);
  const { background, primary, foreground, muted, border } = theme;
  const fonts = await socialFonts(config, source => localAsset(docsDir, source));
  const logo = localAsset(docsDir, config.logo?.[theme.mode] || config.logo?.light || config.logo?.dark);
  const imageTypes: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
  const logoType = logo && imageTypes[extname(logo).toLowerCase()];
  const logoData = logo && logoType ? `data:${logoType};base64,${readFileSync(logo).toString('base64')}` : undefined;
  const size = title.length > 85 ? 54 : 66;
  const lines = wrapSocialText(title, Math.floor(1048 / (size * 0.66)), 3);
  const text = (value: string, x: number, y: number, fontSize: number, color: string, family = fonts.body, weight = 400, maxWidth = 1050) => {
    const attributes = `font-family="${escapeHtml(family)}" fill="${escapeHtml(color)}" font-weight="${weight}"`;
    // Wide display families need actual glyph measurement, not character counts.
    const sample = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="200"><text y="100" font-size="${fontSize}" ${attributes}>${escapeHtml(value)}</text></svg>`, { font: { loadSystemFonts: false, fontFiles: fonts.files, defaultFontFamily: fonts.body } });
    const width = sample.innerBBox()?.width || 0;
    const fitted = width > maxWidth ? fontSize * maxWidth / width : fontSize;
    return `<text x="${x}" y="${y}" font-size="${fitted}" ${attributes}>${escapeHtml(value)}</text>`;
  };
  const subtitleY = Math.max(350, 219 + (lines.length - 1) * 74 + 57);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs><radialGradient id="glow"><stop stop-color="${escapeHtml(primary)}" stop-opacity=".12"/><stop offset="1" stop-color="${escapeHtml(background)}" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="630" fill="${escapeHtml(background)}"/>
    <ellipse cx="1040" cy="70" rx="620" ry="490" fill="url(#glow)"/>
    <rect x="72" y="66" width="5" height="29" rx="2" fill="${escapeHtml(primary)}"/>
    ${text('DOCUMENTATION', 94, 88, 18, muted, fonts.mono)}
    ${lines.map((line, i) => text(line, 72, 219 + i * 74, size, foreground, fonts.heading, 700)).join('')}
    ${wrapSocialText(description, 70, 2).map((line, i) => text(line, 76, subtitleY + i * 34, 25, muted)).join('')}
    <path d="M72 510H1128" stroke="${escapeHtml(border)}"/>
    ${logoData ? `<image href="${logoData}" x="72" y="540" width="40" height="40"/>` : ''}
    ${text(wrapSocialText(name, 36, 1)[0] ?? '', logoData ? 128 : 72, 570, 29, foreground, fonts.heading, 700, 510)}
    <text x="1128" y="568" text-anchor="end" font-family="${escapeHtml(fonts.mono)}" font-size="17" fill="${escapeHtml(primary)}">${escapeHtml(wrapSocialText(config.url?.replace(/^https?:\/\//, '').replace(/\/$/, '') ?? '', 45, 1)[0] ?? '')}</text>
  </svg>`;
  return { svg, fonts };
}

/** Build-only PNG generation: UX fonts, local branding, no browser or network. */
export async function renderSocialPreview(options: PreviewOptions): Promise<string> {
  const { svg, fonts } = await socialPreviewSvg(options);
  const path = socialPreviewPath(options.route);
  const file = resolve(options.outDir, path.slice(1));
  mkdirSync(dirname(file), { recursive: true });
  const renderer = new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: fonts.files, defaultFontFamily: fonts.body } });
  writeFileSync(file, renderer.render().asPng());
  return path;
}
