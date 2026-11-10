import { afterEach, expect, test } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareEmbeddedStylesheets } from './embedded-styles';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'dory-embedded-styles-'));
  roots.push(root);
  mkdirSync(join(root, 'nested'));
  return root;
}

test('prepares ordered self-contained CSS with local imports and raster assets', () => {
  const root = fixture();
  writeFileSync(join(root, 'logo.png'), Buffer.from([137, 80, 78, 71]));
  writeFileSync(join(root, 'nested/imported.css'), '.brand { background-image: url(../logo.png); }');
  writeFileSync(join(root, 'first.css'), '@import "nested/imported.css"; .brand { color: red; }');
  writeFileSync(join(root, 'second.css'), '.brand { color: blue; }');
  const result = prepareEmbeddedStylesheets(['./first.css', 'second.css'], root);
  expect(result.map(file => file.path)).toEqual(['first.css', 'second.css']);
  expect(result[0].content).toContain('data:image/png;base64,iVBORw==');
  expect(result[0].content).not.toContain('@import');
  expect(result[0].content).toContain('color: red');
});

test('retains import media, layer and supports conditions', () => {
  const root = fixture();
  writeFileSync(join(root, 'imported.css'), '.brand { color: blue }');
  writeFileSync(join(root, 'entry.css'), '@import "imported.css" layer(brand) supports(display: grid) screen and (min-width: 700px);');
  const css = prepareEmbeddedStylesheets(['entry.css'], root)[0].content;
  expect(css).toContain('@layer brand');
  expect(css).toContain('@supports (display: grid)');
  expect(css).toContain('@media screen and (min-width: 700px)');
});

test('rejects unsafe dependencies and cyclic imports before producing a payload', () => {
  const root = fixture();
  writeFileSync(join(root, 'entry.css'), '.brand { background: url(https://attacker.test/a.png) }');
  expect(() => prepareEmbeddedStylesheets(['entry.css'], root)).toThrow();
  writeFileSync(join(root, 'entry.css'), '@import "nested/a.css";');
  writeFileSync(join(root, 'nested/a.css'), '@import "../entry.css";');
  expect(() => prepareEmbeddedStylesheets(['entry.css'], root)).toThrow('circular');
});

test('bounds repeated import expansion and rejects unsupported resource functions', () => {
  const root = fixture();
  writeFileSync(join(root, 'child.css'), '.x { color: red }');
  writeFileSync(join(root, 'entry.css'), '@import "child.css";'.repeat(257));
  expect(() => prepareEmbeddedStylesheets(['entry.css'], root)).toThrow('256 imports');
  writeFileSync(join(root, 'entry.css'), '.x { background: image-set("data:image/png;base64,AA==" 1x) }');
  expect(() => prepareEmbeddedStylesheets(['entry.css'], root)).toThrow('image-set');
});
