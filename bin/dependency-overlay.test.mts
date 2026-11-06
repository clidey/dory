import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createDependencyOverlay } from './dependency-overlay.js';

const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'dory-dependency-overlay-')));
  roots.push(root);
  const dory = join(root, 'dory', 'node_modules');
  const project = join(root, 'project');
  const workspace = join(root, 'build');
  mkdirSync(dory, { recursive: true });
  mkdirSync(join(project, 'docs'), { recursive: true });
  mkdirSync(join(workspace, 'docs'), { recursive: true });
  return { root, dory, project, workspace, destination: join(workspace, 'node_modules') };
}

function installed(directory: string, name: string, origin: string): string {
  const path = join(directory, name);
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, 'package.json'), JSON.stringify({ name, main: 'index.js' }));
  writeFileSync(join(path, 'index.js'), `module.exports = ${JSON.stringify(origin)};`);
  return path;
}

function marker(root: string, name = 'pnpm-lock.yaml') {
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, name), name === 'package.json' ? '{}' : '');
}

test('preserves Dory packages while exposing missing consuming-project dependencies', () => {
  const f = fixture();
  marker(f.project);
  const doryVite = installed(f.dory, 'vite', 'Dory toolchain');
  installed(join(f.project, 'node_modules'), 'vite', 'Project toolchain');
  const chart = installed(join(f.project, 'node_modules'), 'recharts', 'Project chart');
  createDependencyOverlay(f.destination, f.dory, join(f.project, 'docs'));
  assert.equal(realpathSync(join(f.destination, 'vite')), doryVite);
  assert.equal(realpathSync(join(f.destination, 'recharts')), chart);
  const require = createRequire(join(f.workspace, 'docs', 'example.cjs'));
  assert.equal(require('vite'), 'Dory toolchain');
  assert.equal(require('recharts'), 'Project chart');
});

test('merges scoped packages and prefers project-local dependencies over workspace ancestors', () => {
  const f = fixture();
  marker(f.project, 'pnpm-workspace.yaml');
  const doryUx = installed(f.dory, '@clidey/ux', 'Dory UX');
  installed(join(f.project, 'node_modules'), '@clidey/ux', 'Workspace UX');
  installed(join(f.project, 'node_modules'), '@example/maps', 'Workspace map');
  const localMap = installed(join(f.project, 'docs', 'node_modules'), '@example/maps', 'Local map');
  const missing = installed(join(f.project, 'node_modules'), '@clidey/example', 'Workspace example');
  createDependencyOverlay(f.destination, f.dory, join(f.project, 'docs'));
  assert.equal(realpathSync(join(f.destination, '@clidey/ux')), doryUx);
  assert.equal(realpathSync(join(f.destination, '@clidey/example')), missing);
  assert.equal(realpathSync(join(f.destination, '@example/maps')), localMap);
});

test('stops at the nearest workspace or lockfile root', () => {
  for (const rootMarker of ['pnpm-workspace.yaml', 'package-lock.json', 'yarn.lock']) {
    const f = fixture();
    marker(f.project, rootMarker);
    installed(join(f.root, 'node_modules'), 'outside', 'Outside project');
    installed(join(f.project, 'node_modules'), 'inside', 'Inside project');
    createDependencyOverlay(f.destination, f.dory, join(f.project, 'docs'));
    assert.equal(existsSync(join(f.destination, 'outside')), false);
    assert.equal(existsSync(join(f.destination, 'inside')), true);
  }
});

test('a nearer lockfile prevents searching a parent workspace', () => {
  const f = fixture();
  marker(f.project, 'pnpm-workspace.yaml');
  marker(join(f.project, 'docs'), 'package-lock.json');
  installed(join(f.project, 'node_modules'), 'parent-only', 'Outside nested project');
  createDependencyOverlay(f.destination, f.dory, join(f.project, 'docs'));
  assert.equal(existsSync(join(f.destination, 'parent-only')), false);
});

test('recognizes package.json workspaces and bounds projects without workspace markers', () => {
  const f = fixture();
  writeFileSync(join(f.project, 'package.json'), JSON.stringify({ workspaces: ['docs'] }));
  installed(join(f.project, 'node_modules'), 'inside', 'Workspace package');
  installed(join(f.root, 'node_modules'), 'outside', 'Outside package');
  createDependencyOverlay(f.destination, f.dory, join(f.project, 'docs'));
  assert.equal(existsSync(join(f.destination, 'inside')), true);
  assert.equal(existsSync(join(f.destination, 'outside')), false);

  const fallback = fixture();
  marker(fallback.project, 'package.json');
  installed(join(fallback.project, 'node_modules'), 'inside', 'Package dependency');
  installed(join(fallback.root, 'node_modules'), 'outside', 'Outside package');
  createDependencyOverlay(fallback.destination, fallback.dory, join(fallback.project, 'docs'));
  assert.equal(existsSync(join(fallback.destination, 'inside')), true);
  assert.equal(existsSync(join(fallback.destination, 'outside')), false);
});

test('skips metadata, executables, loose files and broken links without mutating installed dependencies', () => {
  const f = fixture();
  marker(f.project);
  installed(f.dory, 'vite', 'Dory toolchain');
  installed(f.dory, '.pnpm', 'Metadata');
  installed(f.dory, '.bin', 'Executables');
  writeFileSync(join(f.dory, '.modules.yaml'), 'metadata');
  writeFileSync(join(f.dory, 'loose-file'), 'not a package');
  symlinkSync(join(f.root, 'missing'), join(f.dory, 'broken'), 'dir');
  const before = readdirSync(f.dory).sort();
  createDependencyOverlay(f.destination, f.dory, join(f.project, 'docs'));
  assert.deepEqual(readdirSync(f.destination), ['vite']);
  assert.deepEqual(readdirSync(f.dory).sort(), before);
  assert.equal(readFileSync(join(f.dory, '.modules.yaml'), 'utf8'), 'metadata');
  assert.equal(readdirSync(join(f.workspace, 'docs')).length, 0);
});

test('does not write through an existing destination symlink', () => {
  const f = fixture();
  symlinkSync(f.dory, f.destination, 'dir');
  assert.throws(() => createDependencyOverlay(f.destination, f.dory, f.project), { code: 'EEXIST' });
  assert.deepEqual(readdirSync(f.dory), []);
});

test('resolves package-manager symlinks while retaining each package dependency tree', () => {
  const f = fixture();
  marker(f.project);
  const modules = join(f.project, 'node_modules');
  const store = join(modules, '.pnpm', 'recharts', 'node_modules');
  const chart = installed(store, 'recharts', 'Chart package');
  installed(join(chart, 'node_modules'), 'chart-helper', 'Nested dependency');
  writeFileSync(join(chart, 'index.js'), 'module.exports = require("chart-helper");');
  symlinkSync(chart, join(modules, 'recharts'), 'dir');
  createDependencyOverlay(f.destination, f.dory, join(f.project, 'docs'));
  assert.equal(realpathSync(join(f.destination, 'recharts')), realpathSync(chart));
  assert.equal(existsSync(join(f.destination, '.pnpm')), false);
  assert.equal(createRequire(join(f.workspace, 'docs', 'example.cjs'))('recharts'), 'Nested dependency');
});

test('only an explicit matching override takes precedence over Dory and project packages', () => {
  const f = fixture();
  marker(f.project);
  installed(f.dory, '@clidey/ux', 'Published UX');
  const vite = installed(f.dory, 'vite', 'Dory toolchain');
  installed(join(f.project, 'node_modules'), '@clidey/ux', 'Project UX');
  const localUx = installed(join(f.root, 'local'), '@clidey/ux', 'Local built UX');
  createDependencyOverlay(f.destination, f.dory, join(f.project, 'docs'), JSON.stringify({ '@clidey/ux': localUx }));
  assert.equal(realpathSync(join(f.destination, '@clidey/ux')), realpathSync(localUx));
  assert.equal(realpathSync(join(f.destination, 'vite')), realpathSync(vite));
  assert.equal(createRequire(join(f.workspace, 'docs', 'example.cjs'))('@clidey/ux'), 'Local built UX');
  assert.equal(readFileSync(join(f.dory, '@clidey/ux', 'index.js'), 'utf8'), 'module.exports = "Published UX";');
  assert.deepEqual(readdirSync(join(f.workspace, 'docs')), []);
});

test('rejects package override names that could traverse or misuse scope paths', () => {
  for (const name of ['../outside', '/outside', '..', '@scope/../../outside', '@scope/pkg/nested', 'bad\\name', '.pnpm', '@scope/.bin', '@scope']) {
    const f = fixture();
    assert.throws(() => createDependencyOverlay(f.destination, f.dory, f.project, JSON.stringify({ [name]: f.root })), /Invalid package override name/);
    assert.equal(existsSync(f.destination), false);
  }
});

test('rejects malformed mappings before creating the dependency overlay', () => {
  for (const input of ['', '{', '[]', 'null', '"package"', '12']) {
    const f = fixture();
    assert.throws(() => createDependencyOverlay(f.destination, f.dory, f.project, input), /DORY_PACKAGE_OVERRIDES must be a JSON object/);
    assert.equal(existsSync(f.destination), false);
  }
});

test('requires an absolute override directory with a matching package manifest', () => {
  const f = fixture();
  const otherPackage = installed(join(f.root, 'local'), '@example/other', 'Other package');
  for (const [target, expected] of [
    ['relative/package', /existing absolute package directory/],
    [17, /existing absolute package directory/],
    [join(f.root, 'missing'), /existing absolute package directory/],
    [f.root, /readable package.json/],
    [otherPackage, /matching package.json name/],
  ] as const) {
    assert.throws(() => createDependencyOverlay(f.destination, f.dory, f.project, JSON.stringify({ '@clidey/ux': target })), expected);
    assert.equal(existsSync(f.destination), false);
  }
});

test('validates every override before linking any package', () => {
  const f = fixture();
  const localUx = installed(join(f.root, 'local'), '@clidey/ux', 'Local built UX');
  const overrides = JSON.stringify({ '@clidey/ux': localUx, '../outside': f.root });
  assert.throws(() => createDependencyOverlay(f.destination, f.dory, f.project, overrides), /Invalid package override name/);
  assert.equal(existsSync(f.destination), false);
});
