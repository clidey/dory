import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

interface LocaleConfig { code: string; label: string }
interface ProjectConfig {
  i18n?: { defaultLocale: string; locales: LocaleConfig[] };
  versions?: Array<{ id?: string }>;
}

const LOCALE_CODE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i;

/** Scaffold unpublished translation templates without replacing authored pages. */
export function initLocale(projectRoot: string, locale: string): { templatesCreated: number; directory: string } {
  if (!LOCALE_CODE.test(locale)) throw new Error('Locale must be a language tag such as fr or pt-BR');
  const root = resolve(projectRoot);
  const configPath = join(root, 'dory.json');
  if (!existsSync(configPath)) throw new Error('dory.json not found; run `dory init` first');
  const config = JSON.parse(readFileSync(configPath, 'utf8')) as ProjectConfig;
  if (config.versions?.some(entry => entry.id === locale)) throw new Error(`${locale} is already a version ID`);
  const docsDir = join(root, 'docs');
  if (!existsSync(docsDir)) throw new Error('docs/ not found; create your documentation there first');

  const defaultLocale = config.i18n?.defaultLocale ?? 'en';
  if (locale === defaultLocale) throw new Error(`${locale} is already the default locale`);
  const locales = config.i18n?.locales ?? [{ code: defaultLocale, label: defaultLocale }];
  if (!locales.some(entry => entry.code === locale)) {
    locales.push({ code: locale, label: locale });
  }
  config.i18n = { defaultLocale, locales };

  const excluded = new Set([
    ...locales.map(entry => entry.code),
    ...(config.versions ?? []).map(entry => entry.id).filter((id): id is string => Boolean(id)),
  ]);
  const directory = join(docsDir, locale);
  let templatesCreated = 0;
  const visit = (dir: string) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const source = join(dir, item.name);
      if (item.isDirectory()) {
        if (dir === docsDir && excluded.has(item.name)) continue;
        visit(source);
      } else if (item.isFile() && item.name.endsWith('.mdx')) {
        const rel = relative(docsDir, source);
        const target = join(directory, `${rel}.template`);
        const published = join(directory, rel);
        if (existsSync(target) || existsSync(published)) continue;
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, readFileSync(source));
        templatesCreated++;
      }
    }
  };
  visit(docsDir);
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return { templatesCreated, directory };
}
