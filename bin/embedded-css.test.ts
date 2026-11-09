import { expect, test } from 'vitest';
import { embeddedStyleLimits, normalizeEmbeddedStylePath, validateEmbeddedCss, validateEmbeddedStylesheets } from './embedded-css';

test('accepts theme-aware CSS, local fragments and inlined raster/font assets', () => {
  expect(() => validateEmbeddedCss(`
    @media (min-width: 600px) and (max-width: 1000px) {
      .dark .example:is(.a, .b) { color: color-mix(in oklch, var(--primary) 30%, transparent); width: calc(100% - 2rem); }
    }
    @font-face { font-family: Example; src: url("data:font/woff2;base64,AA==") format("woff2"); }
    .example { background-image: url(data:image/png;base64,AA==); filter: url(#local-filter); }
  `)).not.toThrow();
});

test.each([
  '@import "https://example.com/leak.css";',
  '@IMPORT/**/"other.css";',
  '.x { background: url(https://example.com/leak); }',
  '.x { background: u/**/rl(//example.com/leak); }',
  '.x { background: URL(../private.txt); }',
  '.x { background: image-set("https://example.com/leak" 1x); }',
  '.x { background: -webkit-image-set("https://example.com/leak" 1x); }',
  '.x { background: src("https://example.com/leak"); }',
  '.x { background: url(data:image/svg+xml;base64,AA==); }',
  '.x { background: url(data:text/html;base64,AA==); }',
  '.x { background: u\\72l(https://example.com/leak); }',
  '.x { content: "/*"; background: url(https://example.com/leak); content: "*/"; }',
  '.x { content: "\n; background: url(https://example.com/leak);\n"; }',
])('rejects CSS that can request host or external resources: %s', css => {
  expect(() => validateEmbeddedCss(css)).toThrow();
});

test('quoted content does not create fake URL requests', () => {
  expect(() => validateEmbeddedCss('.x::before { content: "url(https://example.com) /* text */"; }')).not.toThrow();
});

test('selects only declared CSS paths in configuration order', () => {
  const result = validateEmbeddedStylesheets(['./first.css', 'styles/second.css'], [
    { path: 'styles/second.css', content: '.second { color: red; }' },
    { path: 'first.css', content: '.first { color: blue; }' },
  ]);
  expect(result.map(sheet => sheet.path)).toEqual(['first.css', 'styles/second.css']);
  expect(validateEmbeddedStylesheets(undefined, undefined)).toEqual([]);
  expect(validateEmbeddedStylesheets(undefined, [])).toEqual([]);
  expect(validateEmbeddedStylesheets([], undefined)).toEqual([]);
});

test.each(['../private.css', '/site.css', 'https://example.com/site.css', 'styles/../../private.css', 'styles\\site.css'])('rejects unsafe configured paths: %s', path => {
  expect(normalizeEmbeddedStylePath(path)).toBeUndefined();
});

test('rejects missing, extra and duplicate stylesheets and oversized content', () => {
  expect(() => validateEmbeddedStylesheets(['site.css'], [])).toThrow();
  expect(() => validateEmbeddedStylesheets([], [{ path: 'site.css', content: '' }])).toThrow();
  expect(() => validateEmbeddedStylesheets(['site.css', './site.css'], [])).toThrow();
  expect(() => validateEmbeddedStylesheets(['site.css'], [{ path: 'site.css', content: 'x'.repeat(embeddedStyleLimits.fileBytes + 1) }])).toThrow('size limit');
});
