import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import postcss from 'postcss';
import valueParser, { type Node } from 'postcss-value-parser';
import { isResourceFreeCssFunction, isSafeCssAtRule } from './embedded-css.js';

const assetExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot']);
const dataTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/x-icon', 'font/woff', 'font/woff2', 'font/ttf', 'font/otf', 'application/font-woff']);
const maxFiles = 128;
const maxBytes = 8 * 1024 * 1024;

export interface StylesheetDependencies {
  stylesheets: Set<string>;
  assets: Set<string>;
}

/** Decode CSS escapes before interpreting a filename or function name. */
export function decodeCssEscapes(value: string): string {
  return value.replace(/\\([0-9a-f]{1,6})(?:\r\n|[ \n\r\t\f])?|\\([^\n\r\f0-9a-f])|\\(?:\r\n|[\n\r\f])/gi, (_match, hex: string | undefined, character: string | undefined) => {
    if (!hex) return character ?? '';
    const code = parseInt(hex, 16);
    return code === 0 || code > 0x10ffff ? '\ufffd' : String.fromCodePoint(code);
  });
}

function safeFile(source: string, base: string, docsDir: string, kind: 'Stylesheet' | 'CSS asset'): string {
  const root = realpathSync(docsDir);
  const outside = (file: string) => {
    const path = relative(root, file);
    return path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path);
  };
  if (!source || /[\x00-\x1f\x7f]/.test(source) || source.includes('\\') || isAbsolute(source) || /^[a-z][a-z0-9+.-]*:/i.test(source)) {
    throw new Error(`${kind} must be a relative local file: ${source}`);
  }
  const file = resolve(base, source);
  if (outside(file)) throw new Error(`${kind} must stay inside the documentation directory: ${source}`);
  if (!existsSync(file) || !statSync(file).isFile()) throw new Error(`${kind} not found: ${source}`);
  const actual = realpathSync(file);
  if (outside(actual)) throw new Error(`${kind} must stay inside the documentation directory: ${source}`);
  if (actual !== file) throw new Error(`${kind} paths must not use symlinks: ${source}`);
  return file;
}

/** Resolve an already parsed CSS reference with the graph validator's policy. */
export function resolveCssReference(raw: string, importer: string, docsDir: string, imported = false): string | undefined {
  let reference = decodeCssEscapes(raw).trim();
  if (!imported && reference.startsWith('#')) return;
  if (!imported && /^data:/i.test(reference)) {
    const type = reference.match(/^data:([^;,]+)(?:;base64)?,/i)?.[1].toLowerCase();
    if (type && dataTypes.has(type)) return;
    throw new Error(`CSS data URLs must contain a raster image or font: ${importer}`);
  }
  if (reference.includes('?')) throw new Error(`CSS references must not use query parameters: ${reference}`);
  reference = reference.split('#', 1)[0];
  try { reference = decodeURIComponent(reference); }
  catch { throw new Error(`Invalid encoded CSS reference: ${reference}`); }
  if (reference.includes('%')) throw new Error(`CSS references must not use nested URL encoding: ${reference}`);
  const extension = extname(reference).toLowerCase();
  if (imported ? extension !== '.css' : !assetExtensions.has(extension)) {
    throw new Error(`${imported ? 'Stylesheet imports must reference .css files' : 'CSS URLs must reference public raster image or font files'}: ${reference}`);
  }
  return safeFile(reference, dirname(importer), docsDir, imported ? 'Stylesheet' : 'CSS asset');
}

export function cssUrlValue(node: Node): string {
  if (node.type === 'string' || node.type === 'word') return node.value;
  if (node.type === 'function' && ['url', 'src'].includes(decodeCssEscapes(node.value).toLowerCase())) {
    const content = node.nodes.filter(part => part.type !== 'comment' && part.type !== 'space');
    if (content.length === 1 && (content[0].type === 'word' || content[0].type === 'string')) return content[0].value;
  }
  throw new Error('CSS URLs must use a literal local filename');
}

/** Validate the complete CSS graph before Vite can inline imports or asset bytes. */
export function validateStylesheetDependencies(file: string, docsDir: string): StylesheetDependencies {
  const dependencies: StylesheetDependencies = { stylesheets: new Set(), assets: new Set() };
  let bytes = 0;
  const account = (path: string) => {
    if (dependencies.stylesheets.size + dependencies.assets.size >= maxFiles) throw new Error('CSS dependency graph exceeds 128 files');
    bytes += statSync(path).size;
    if (bytes > maxBytes) throw new Error('CSS dependency graph exceeds 8 MB');
  };
  const visit = (path: string, depth: number) => {
    if (dependencies.stylesheets.has(path)) return;
    if (depth > 16) throw new Error('CSS import depth exceeds 16');
    account(path);
    dependencies.stylesheets.add(path);
    const css = postcss.parse(readFileSync(path, 'utf8'), { from: path });
    const asset = (raw: string) => {
      if (raw.length > maxBytes) throw new Error('CSS data URL exceeds 8 MB');
      const resolved = resolveCssReference(raw, path, docsDir);
      if (resolved && !dependencies.assets.has(resolved)) { account(resolved); dependencies.assets.add(resolved); }
    };
    const scanValues = (value: string, importQualifiers = false) => {
      valueParser(value).walk(node => {
        if (node.type !== 'function') return;
        const name = decodeCssEscapes(node.value).toLowerCase();
        if (!name) return; // Parentheses grouping in media/supports/math expressions.
        if (name === 'url' || name === 'src') { asset(cssUrlValue(node)); return false; }
        if (['image-set', '-webkit-image-set', 'image'].includes(name)) {
          // These functions accept strings computed through var(), which can
          // create network URLs only after CSS validation has completed.
          throw new Error(`CSS does not support resource-producing ${name}()`);
        }
        if (!isResourceFreeCssFunction(name) && !(importQualifiers && (name === 'layer' || name === 'supports'))) {
          throw new Error(`CSS does not support ${name}()`);
        }
      });
    };
    css.walkAtRules(rule => {
      const name = decodeCssEscapes(rule.name).toLowerCase();
      if (name === 'import') {
        const parameters = valueParser(rule.params).nodes;
        const first = parameters.find(node => node.type !== 'comment' && node.type !== 'space');
        if (!first) throw new Error(`Empty CSS import: ${path}`);
        const imported = resolveCssReference(cssUrlValue(first), path, docsDir, true);
        if (imported) visit(imported, depth + 1);
        scanValues(valueParser.stringify(parameters.slice(parameters.indexOf(first) + 1)), true);
      } else {
        // Tailwind and other build tools consume executable/import directives
        // such as @plugin/@reference before the ordinary CSS asset resolver.
        if (!isSafeCssAtRule(name)) throw new Error(`CSS does not support @${name}`);
        scanValues(rule.params);
      }
    });
    css.walkDecls(declaration => scanValues(declaration.value));
  };
  const entry = safeFile(relative(realpathSync(docsDir), file), realpathSync(docsDir), docsDir, 'Stylesheet');
  visit(entry, 0);
  return dependencies;
}

/** Resolves ordered local CSS files and validates their entire dependency graph. */
export function resolveStylesheets(styles: unknown, docsDir: string): string[] {
  if (styles === undefined) return [];
  if (!Array.isArray(styles) || styles.some(style => typeof style !== 'string' || !style.trim())) {
    throw new Error('"styles" must be an array of local CSS file paths');
  }
  if (styles.length > 32) throw new Error('"styles" must contain at most 32 stylesheets');
  return styles.map((style: string) => {
    if (isAbsolute(style) || /^[a-z][a-z0-9+.-]*:/i.test(style) || extname(style) !== '.css') {
      throw new Error(`Stylesheet must be a relative .css file: ${style}`);
    }
    const root = realpathSync(docsDir);
    const file = safeFile(style, root, docsDir, 'Stylesheet');
    validateStylesheetDependencies(file, docsDir);
    return file;
  });
}
