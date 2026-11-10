import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveStylesheets } from './styles';

const roots: string[] = [];
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'dory-styles-'));
  roots.push(root);
  const docs = join(root, 'docs');
  mkdirSync(docs);
  writeFileSync(join(docs, 'first.css'), '.example { color: red; }');
  writeFileSync(join(docs, 'second.css'), '.example { color: blue; }');
  return { root, docs };
}

afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

describe('global stylesheet paths', () => {
  it('leaves sites without custom styles unchanged', () => {
    const { docs } = fixture();
    expect(resolveStylesheets(undefined, docs)).toEqual([]);
    expect(resolveStylesheets([], docs)).toEqual([]);
  });

  it('preserves configured order and supports paths with spaces', () => {
    const { docs } = fixture();
    writeFileSync(join(docs, 'with spaces.css'), 'body {}');
    expect(resolveStylesheets(['second.css', './first.css', 'with spaces.css'], docs))
      .toEqual(['second.css', 'first.css', 'with spaces.css'].map(file => join(realpathSync(docs), file)));
  });

  it.each(['first.css', [null], ['']])('rejects invalid style lists: %j', styles => {
    expect(() => resolveStylesheets(styles, fixture().docs)).toThrow('must be an array');
  });

  it.each(['https://example.com/site.css', '/site.css', 'site.scss'])('rejects non-local CSS entries: %s', style => {
    expect(() => resolveStylesheets([style], fixture().docs)).toThrow('relative .css file');
  });

  it('rejects missing files and directories', () => {
    const { docs } = fixture();
    mkdirSync(join(docs, 'directory.css'));
    expect(() => resolveStylesheets(['missing.css'], docs)).toThrow('Stylesheet not found');
    expect(() => resolveStylesheets(['directory.css'], docs)).toThrow('Stylesheet not found');
  });

  it('does not expose stylesheets outside the documentation directory', () => {
    const { root, docs } = fixture();
    writeFileSync(join(root, 'private.css'), 'body {}');
    symlinkSync(join(root, 'private.css'), join(docs, 'linked.css'));
    expect(() => resolveStylesheets(['../private.css'], docs)).toThrow('must stay inside');
    expect(() => resolveStylesheets(['linked.css'], docs)).toThrow('must stay inside');
    symlinkSync(join(docs, 'first.css'), join(docs, 'alias.css'));
    expect(() => resolveStylesheets(['alias.css'], docs)).toThrow('must not use symlinks');
  });
});

describe('CSS dependency graph boundaries', () => {
  const rejected = [
    '@import "../private.css";',
    '@import url("https://example.com/remote.css");',
    '@import "//example.com/remote.css";',
    '@import "data:text/css,body%7Bcolor:red%7D";',
    '@\\69mport "../private.css";',
    'body { background: url("../private.png"); }',
    'body { background: u\\72l("../private.png"); }',
    'body { background: url("%2e%2e/private.png"); }',
    'body { background: url("%252e%252e/private.png"); }',
    'body { background: url("../private.txt"); }',
    'body { background: url("https://example.com/image.png"); }',
    'body { background: url("//example.com/image.png"); }',
    'body { background: url("/image.png"); }',
    'body { background: image-set("https://example.com/image.png" 1x); }',
    ':root { --remote: "https://example.com/image.png"; } body { background: image-set(var(--remote) 1x); }',
    ':root { --remote: "https://example.com/image.png"; } body { background: image(var(--remote), red); }',
    'body { background: -webkit-image-set("../private.png" 1x); }',
    'body { background: image("../private.png", red); }',
    '@font-face { src: src("https://example.com/font.woff2"); }',
    'body { background: url("data:text/html,<script>alert(1)</script>"); }',
    'body { background: url("data:image/svg+xml,<svg/>"); }',
    'body { background: url("shape.svg"); }',
    'body { background: url("image.png?raw"); }',
    'body { background: url(var(--untrusted-url)); }',
    '@reference "../private.css";',
    '@source "../private.txt";',
    '@plugin "../private.js";',
    '@config "../tailwind.config.js";',
    '@apply custom-utility;',
    '@\\70lugin "../private.js";',
    'body { background: future-network-function("https://example.com/image.png"); }',
  ];
  it.each(rejected)('blocks unsafe dependencies: %s', css => {
    const { root, docs } = fixture();
    writeFileSync(join(root, 'private.css'), 'body {}');
    writeFileSync(join(root, 'private.png'), 'private');
    writeFileSync(join(root, 'private.txt'), 'secret');
    writeFileSync(join(docs, 'first.css'), css);
    expect(() => resolveStylesheets(['first.css'], docs)).toThrow();
  });

  it('validates every nested import and rejects symlinked dependencies', () => {
    const { root, docs } = fixture();
    writeFileSync(join(docs, 'first.css'), '@import "second.css";');
    writeFileSync(join(docs, 'second.css'), 'body { background: url("linked.png"); }');
    writeFileSync(join(root, 'private.png'), 'private');
    symlinkSync(join(root, 'private.png'), join(docs, 'linked.png'));
    expect(() => resolveStylesheets(['first.css'], docs)).toThrow('must stay inside');
  });

  it('allows local nested CSS, raster assets, font files and restricted data URLs', () => {
    const { docs } = fixture();
    writeFileSync(join(docs, 'first.css'), '@import url("second.css") screen; body { background: url("image.png"); }');
    writeFileSync(join(docs, 'second.css'), '@font-face { src: url("font.woff2"); } .inline { background: url("data:image/png;base64,aGVsbG8="); }');
    writeFileSync(join(docs, 'image.png'), 'image');
    writeFileSync(join(docs, 'font.woff2'), 'font');
    expect(resolveStylesheets(['first.css'], docs)).toHaveLength(1);
  });

  it('handles cycles without recursive exhaustion', () => {
    const { docs } = fixture();
    writeFileSync(join(docs, 'first.css'), '@import "second.css";');
    writeFileSync(join(docs, 'second.css'), '@import "first.css";');
    expect(resolveStylesheets(['first.css'], docs)).toHaveLength(1);
  });

  it('rejects oversized stylesheet input before parsing or inlining', () => {
    const { docs } = fixture();
    writeFileSync(join(docs, 'first.css'), ' '.repeat(8 * 1024 * 1024 + 1));
    expect(() => resolveStylesheets(['first.css'], docs)).toThrow('exceeds 8 MB');
  });
});
