import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { DoryConfig } from '../types/config.ts';
import { escapeHtml } from './shared.ts';

export function socialPreviewPath(route: string): string {
  return route === '/' ? '/_dory/social/home.png' : `/_dory/social/page-${createHash('sha256').update(route).digest('hex').slice(0, 20)}.png`;
}

function localAsset(docsDir: string, source?: string): string | undefined {
  if (!source || /^(?:[a-z]+:|\/\/)/i.test(source)) return;
  const file = resolve(docsDir, source.replace(/^\//, ''));
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

/** Build-only PNG generation: local files, bundled font, no browser or network. */
export function renderSocialPreview({ route, title, description, config, docsDir, outDir }: {
  route: string; title: string; description: string; config: Partial<DoryConfig>; docsDir: string; outDir: string;
}): string {
  const name = config.name || 'Documentation';
  const hex = (value: string | undefined, fallback: string) => value && /^#[a-f\d]{3,8}$/i.test(value) ? value : fallback;
  const background = hex(config.colors?.background, '#15243e');
  const primary = hex(config.colors?.primary, '#5c8cf4');
  const foreground = hex(config.colors?.foreground, '#f8f5ed');
  const muted = hex(config.colors?.mutedForeground, '#b2bdd0');
  const logo = localAsset(docsDir, config.logo?.dark ?? config.logo?.light);
  const imageTypes: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
  const logoType = logo && imageTypes[extname(logo).toLowerCase()];
  const logoData = logo && logoType ? `data:${logoType};base64,${readFileSync(logo).toString('base64')}` : undefined;
  const font = localAsset(docsDir, config.fonts?.heading?.source ?? config.fonts?.source);
  const customFont = font && /\.(ttf|otf)$/i.test(font) ? font : undefined;
  const family = customFont ? config.fonts?.heading?.family ?? config.fonts?.family ?? 'Hanken Grotesk' : 'Hanken Grotesk';
  const size = title.length > 85 ? 56 : 64;
  const lines = wrapSocialText(title, Math.floor(1050 / (size * 0.62)), 3);
  const text = (value: string, x: number, y: number, fontSize: number, color: string, weight = 400) => `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}" font-weight="${weight}">${escapeHtml(value)}</text>`;
  const subtitleY = Math.max(350, 225 + (lines.length - 1) * 76 + 65);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${background}"/><rect width="1200" height="8" fill="${primary}"/>
    <circle cx="1170" cy="360" r="280" fill="${primary}" opacity="0.06"/>
    <g font-family="${escapeHtml(family)}, sans-serif">
      ${logoData ? `<image href="${logoData}" x="72" y="62" width="46" height="50"/>` : `<rect x="72" y="64" width="44" height="44" rx="10" fill="${primary}"/>`}
      ${text(wrapSocialText(name, 55, 1)[0] ?? '', 136, 100, 32, foreground, 700)}
      ${lines.map((line, i) => text(line, 72, 225 + i * 76, size, foreground, 700)).join('')}
      ${wrapSocialText(description, 78, 2).map((line, i) => text(line, 76, subtitleY + i * 36, 26, muted)).join('')}
      <path d="M76 518H1124" stroke="${foreground}" opacity="0.15"/>
      ${text('DOCUMENTATION', 76, 565, 17, muted)}
      <text x="1124" y="565" text-anchor="end" font-size="20" fill="${primary}">${escapeHtml(wrapSocialText(config.url?.replace(/^https?:\/\//, '') ?? name, 60, 1)[0] ?? '')}</text>
    </g></svg>`;
  const path = socialPreviewPath(route);
  const file = resolve(outDir, path.slice(1));
  mkdirSync(dirname(file), { recursive: true });
  const renderer = new Resvg(svg, { font: {
    loadSystemFonts: false,
    fontFiles: [resolve(process.cwd(), 'src/assets/fonts/HankenGrotesk.ttf'), ...(customFont ? [customFont] : [])],
    defaultFontFamily: family,
  } });
  writeFileSync(file, renderer.render().asPng());
  return path;
}
