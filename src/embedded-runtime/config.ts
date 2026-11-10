import type { DoryColors, DoryNavigation } from '../types/config';
import { embeddedStyleLimits, normalizeEmbeddedStylePath } from './styles';

export type EmbeddedConfig = {
  name?: string;
  title?: string;
  version?: string;
  copyright?: string;
  repository?: { url: string; branch?: string; path?: string };
  logo?: { light?: string; dark?: string };
  colors?: Partial<DoryColors>;
  fonts?: { family?: string; heading?: { family?: string }; mono?: { family?: string } };
  theme?: { mode?: 'light' | 'dark' | 'system'; radius?: string };
  navigation?: DoryNavigation;
  i18n?: { defaultLocale?: string; locales?: Array<{ code: string; label?: string; navigation?: DoryNavigation }> };
  chat?: { suggestedQuestions?: string[] };
  styles?: string[];
};

const safeText = (value: unknown, length = 100) =>
  typeof value === 'string' && value.length <= length ? value.trim() || undefined : undefined;
const safeColor = (value: unknown) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(value) ? value : undefined;
const safeFont = (value: unknown) => {
  const family = safeText(value, 80);
  return family && /^[\p{L}\p{N} ._-]+$/u.test(family) ? family : undefined;
};
const safeLogo = (value: unknown) => {
  if (typeof value !== 'string' || value.length > 100_000) return undefined;
  return /^(?:https:\/\/[^\s]+|data:image\/(?:svg\+xml|png|webp|jpeg);base64,[A-Za-z0-9+/=]+)$/.test(value) ? value : undefined;
};
const safeRepository = (value: unknown): EmbeddedConfig['repository'] => {
  if (!value || typeof value !== 'object') return undefined;
  const input = value as Record<string, unknown>;
  if (typeof input.url !== 'string' || input.url.length > 300) return undefined;
  try {
    const url = new URL(input.url);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return undefined;
    const branch = safeText(input.branch, 80);
    const path = safeText(input.path, 160);
    if (branch && !/^[a-zA-Z0-9._/-]+$/.test(branch)) return undefined;
    if (path && !/^(?:[a-zA-Z0-9._-]+\/)*[a-zA-Z0-9._-]+$/.test(path)) return undefined;
    return { url: url.href.replace(/\/$/, ''), branch, path };
  } catch { return undefined; }
};

function safeNavigation(value: unknown): DoryNavigation | undefined {
  if (!value || typeof value !== 'object' || !Array.isArray((value as DoryNavigation).tabs)) return undefined;
  const tabs = (value as DoryNavigation).tabs.slice(0, 12).map(tab => ({
    tab: safeText(tab?.tab, 80) ?? '',
    groups: Array.isArray(tab?.groups) ? tab.groups.slice(0, 50).map(group => ({
      group: safeText(group?.group, 80) ?? '',
      pages: Array.isArray(group?.pages) ? group.pages.slice(0, 200).flatMap(entry => {
        const raw = typeof entry === 'string' ? entry : entry?.page;
        const page = safeText(raw, 200)?.replace(/^\/+|\/+$/g, '');
        if (!page || !/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+$/.test(page)) return [];
        return [typeof entry === 'string' ? page : { page, badge: safeText(entry.badge, 24) }];
      }) : [],
    })).filter(group => group.group && group.pages.length) : [],
  })).filter(tab => tab.tab && tab.groups.length);
  return tabs.length ? { tabs } : undefined;
}

export function parseEmbeddedConfig(value: unknown): EmbeddedConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  try {
    if (JSON.stringify(value).length > 200_000) return {};
  } catch {
    return {};
  }
  const input = value as EmbeddedConfig;
  const colors: Partial<DoryColors> = {};
  for (const key of ['primary', 'light', 'dark', 'background', 'surface', 'surfaceElevated', 'foreground', 'mutedForeground', 'border', 'accent'] as const) {
    const safe = safeColor(input.colors?.[key]);
    if (safe) colors[key] = safe;
  }
  const mode = input.theme?.mode;
  const radius = typeof input.theme?.radius === 'string' && /^\d+(?:\.\d+)?(?:px|rem)$/.test(input.theme.radius) ? input.theme.radius : undefined;
  const locales = Array.isArray(input.i18n?.locales) ? input.i18n.locales.slice(0, 24).flatMap(item => {
    const code = safeText(item?.code, 16);
    const navigation = safeNavigation(item?.navigation);
    return code && /^[a-z]{2}(?:[-_][a-zA-Z]{2})?$/.test(code) ? [{ code, label: safeText(item.label, 80), navigation }] : [];
  }) : [];
  const suggestedQuestions = Array.isArray(input.chat?.suggestedQuestions)
    ? input.chat.suggestedQuestions.slice(0, 4).flatMap(question => {
      const value = safeText(question, 120);
      return value && value.length >= 3 ? [value] : [];
    }) : [];
  return {
    name: safeText(input.name), title: safeText(input.title, 160), version: safeText(input.version, 80),
    copyright: safeText(input.copyright, 120), repository: safeRepository(input.repository),
    logo: { light: safeLogo(input.logo?.light), dark: safeLogo(input.logo?.dark) }, colors,
    fonts: { family: safeFont(input.fonts?.family), heading: { family: safeFont(input.fonts?.heading?.family) }, mono: { family: safeFont(input.fonts?.mono?.family) } },
    theme: { mode: mode === 'light' || mode === 'dark' || mode === 'system' ? mode : undefined, radius },
    navigation: safeNavigation(input.navigation), i18n: { defaultLocale: /^[a-z]{2}(?:[-_][a-zA-Z]{2})?$/.test(input.i18n?.defaultLocale ?? '') ? input.i18n?.defaultLocale : undefined, locales },
    chat: { suggestedQuestions },
    styles: Array.isArray(input.styles) && input.styles.length <= embeddedStyleLimits.files
      ? input.styles.flatMap(value => { const path = normalizeEmbeddedStylePath(value); return path ? [path] : []; })
      : undefined,
  };
}

function toRgb(hex: string): string {
  const expanded = hex.length === 4 ? `#${[...hex.slice(1)].map(char => char + char).join('')}` : hex;
  return [1, 3, 5].map(index => Number.parseInt(expanded.slice(index, index + 2), 16)).join(' ');
}

export function applyEmbeddedConfig(config: EmbeddedConfig, theme: 'light' | 'dark') {
  const root = document.documentElement;
  for (const name of ['--brand-primary', '--brand-primary-rgb', '--brand-light', '--brand-light-rgb', '--brand-dark', '--brand-dark-rgb', '--brand-foreground', '--sidebar-primary', '--background', '--foreground', '--card-foreground', '--popover-foreground', '--secondary-foreground', '--card', '--popover', '--sidebar', '--muted', '--secondary', '--muted-foreground', '--border', '--input', '--sidebar-border', '--accent', '--ring', '--font-body', '--font-heading', '--font-mono', '--radius']) root.style.removeProperty(name);
  root.removeAttribute('data-dory-colors');
  const colors = config.colors;
  if (colors) {
    const light = colors.light ?? colors.primary;
    const dark = colors.dark ?? colors.primary;
    if (light || dark) {
      root.setAttribute('data-dory-colors', 'true');
      if (light) root.style.setProperty('--brand-light', light);
      if (dark) root.style.setProperty('--brand-dark', dark);
      if (light) root.style.setProperty('--brand-light-rgb', toRgb(light));
      if (dark) root.style.setProperty('--brand-dark-rgb', toRgb(dark));
      root.style.setProperty('--sidebar-primary', theme === 'dark' ? dark ?? light! : light ?? dark!);
    }
    if (colors.primary) {
      root.style.setProperty('--brand-primary', colors.primary);
      root.style.setProperty('--brand-primary-rgb', toRgb(colors.primary));
      root.style.setProperty('--brand-foreground', colors.primary);
    }
    const mapped: Array<[keyof DoryColors, string[]]> = [
      ['background', ['--background']], ['foreground', ['--foreground', '--card-foreground', '--popover-foreground', '--secondary-foreground']],
      ['surface', ['--card', '--popover', '--sidebar']], ['surfaceElevated', ['--muted', '--secondary']],
      ['mutedForeground', ['--muted-foreground']], ['border', ['--border', '--input', '--sidebar-border']],
      ['accent', ['--accent', '--ring']],
    ];
    for (const [key, names] of mapped) if (colors[key]) for (const name of names) root.style.setProperty(name, colors[key]!);
  }
  if (config.fonts?.family) root.style.setProperty('--font-body', `'${config.fonts.family}', sans-serif`);
  if (config.fonts?.heading?.family) root.style.setProperty('--font-heading', `'${config.fonts.heading.family}', serif`);
  if (config.fonts?.mono?.family) root.style.setProperty('--font-mono', `'${config.fonts.mono.family}', monospace`);
  if (config.theme?.radius) root.style.setProperty('--radius', config.theme.radius);
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}
