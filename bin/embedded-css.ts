/** CSS supplied by the host is confined to the opaque documentation frame. */
export type EmbeddedStylesheet = { path: string; content: string };

export const embeddedStyleLimits = { files: 16, fileBytes: 256_000, totalBytes: 1_000_000 };

export function normalizeEmbeddedStylePath(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 240 || !value.endsWith('.css')) return;
  const path = value.replace(/^\.\//, '');
  if (!path || path.startsWith('/') || /[:\\?#\u0000-\u001f]/.test(path)) return;
  if (path.split('/').some(part => !part || part === '.' || part === '..')) return;
  return path;
}

// New CSS functions fail closed until their resource-loading behavior is reviewed.
const safeFunctions = new Set([
  'var', 'env', 'calc', 'min', 'max', 'clamp', 'round', 'mod', 'rem', 'abs', 'sign',
  'pow', 'sqrt', 'hypot', 'log', 'exp', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix',
  'light-dark', 'contrast-color', 'linear-gradient', 'radial-gradient', 'conic-gradient',
  'repeating-linear-gradient', 'repeating-radial-gradient', 'repeating-conic-gradient',
  'translate', 'translatex', 'translatey', 'translatez', 'translate3d', 'rotate', 'rotatex',
  'rotatey', 'rotatez', 'rotate3d', 'scale', 'scalex', 'scaley', 'scalez', 'scale3d', 'skew',
  'skewx', 'skewy', 'matrix', 'matrix3d', 'perspective', 'blur', 'brightness', 'contrast',
  'drop-shadow', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia',
  'cubic-bezier', 'steps', 'linear', 'repeat', 'minmax', 'fit-content', 'inset', 'circle',
  'ellipse', 'polygon', 'path', 'rect', 'xywh', 'ray', 'counter', 'counters', 'symbols',
  'format', 'tech', 'local', 'is', 'where', 'not', 'has', 'nth-child', 'nth-last-child',
  'nth-of-type', 'nth-last-of-type', 'lang', 'dir', 'host', 'host-context', 'slotted',
  'part', 'state', 'selector', 'style', 'scroll', 'view', 'anchor', 'anchor-size',
]);
const safeAtRules = new Set([
  'charset', 'media', 'supports', 'layer', 'font-face', 'keyframes', '-webkit-keyframes',
  'property', 'container', 'starting-style', 'scope', 'page', 'counter-style',
]);
export const isResourceFreeCssFunction = (name: string): boolean => safeFunctions.has(name.toLowerCase());
export const isSafeCssAtRule = (name: string): boolean => safeAtRules.has(name.toLowerCase());
const safeDataUrl = /^data:(?:image\/(?:png|jpeg|gif|webp|avif)|font\/(?:woff2?|ttf|otf));base64,[a-z\d+/]*={0,2}$/i;

/** Reject all stylesheet network dependencies; the host must inline approved assets. */
export function validateEmbeddedCss(content: string): void {
  // Escapes can disguise identifier names, URL schemes, or quote boundaries.
  if (content.includes('\\') || content.includes('\0')) throw new Error('Embedded CSS must not contain escapes or null characters');
  let css = '';
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '"' || content[i] === "'") {
      const quote = content[i];
      const end = content.indexOf(quote, i + 1);
      if (end < 0 || /[\n\r\f]/.test(content.slice(i + 1, end))) throw new Error('Embedded CSS has an invalid string');
      css += content.slice(i, end + 1);
      i = end;
    } else if (content.slice(i, i + 2) === '/*') {
      const end = content.indexOf('*/', i + 2);
      if (end < 0) throw new Error('Embedded CSS has an unclosed comment');
      i = end + 1;
    } else css += content[i];
  }
  for (let i = 0; i < css.length;) {
    if (css[i] === '"' || css[i] === "'") {
      const quote = css[i++];
      const end = css.indexOf(quote, i);
      if (end < 0) throw new Error('Embedded CSS has an unclosed string');
      i = end + 1;
      continue;
    }
    const identifier = css.slice(i).match(/^(@?[-a-z_][\w-]*)/i);
    if (!identifier) { i++; continue; }
    const token = identifier[1].toLowerCase();
    i += identifier[0].length;
    if (token.startsWith('@')) {
      if (!safeAtRules.has(token.slice(1))) throw new Error(`Embedded CSS does not support ${token}`);
      continue;
    }
    if (css[i] !== '(') continue;
    if (token === 'url') {
      const end = css.indexOf(')', i + 1);
      if (end < 0) throw new Error('Embedded CSS has an unclosed URL');
      let url = css.slice(i + 1, end).trim();
      if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) url = url.slice(1, -1);
      if (!safeDataUrl.test(url) && !/^#[a-z_][\w:.-]*$/i.test(url)) throw new Error('Embedded CSS URLs must be base64 raster images or fonts');
      i = end + 1;
    } else if (!safeFunctions.has(token)) throw new Error(`Embedded CSS does not support ${token}()`);
    else i++;
  }
}

/** Select and order only the styles declared by this documentation site. */
export function validateEmbeddedStylesheets(styles: unknown, payload: unknown): EmbeddedStylesheet[] {
  if (styles === undefined && (payload === undefined || Array.isArray(payload) && payload.length === 0)) return [];
  if (!Array.isArray(styles) || styles.length > embeddedStyleLimits.files) throw new Error('Embedded styles must be a list of at most 16 CSS paths');
  const paths = styles.map(normalizeEmbeddedStylePath);
  if (paths.some(path => !path) || new Set(paths).size !== paths.length) throw new Error('Embedded styles contain invalid or duplicate paths');
  if (payload === undefined && paths.length === 0) return [];
  if (!Array.isArray(payload) || payload.length !== paths.length) throw new Error('Embedded stylesheet contents must match the configured CSS paths');
  const supplied = new Map<string, string>();
  const encoder = new TextEncoder();
  let total = 0;
  for (const item of payload) {
    if (!item || typeof item !== 'object') throw new Error('Invalid embedded stylesheet');
    const path = normalizeEmbeddedStylePath(item.path);
    if (!path || !paths.includes(path) || supplied.has(path) || typeof item.content !== 'string') throw new Error('Invalid embedded stylesheet path or contents');
    if (item.content.length > embeddedStyleLimits.fileBytes) throw new Error('Embedded styles exceed the size limit');
    const bytes = encoder.encode(item.content).length;
    total += bytes;
    if (bytes > embeddedStyleLimits.fileBytes || total > embeddedStyleLimits.totalBytes) throw new Error('Embedded styles exceed the size limit');
    validateEmbeddedCss(item.content);
    supplied.set(path, item.content);
  }
  return paths.map(path => ({ path: path!, content: supplied.get(path!)! }));
}

