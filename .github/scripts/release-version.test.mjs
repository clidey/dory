import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { nextVersion, parseVersion, updateVersion, updateDocumentationVersion, validateReleaseHead, commitVersion } from './release-version.mjs';

test('bump choices follow stable SemVer and reset lower fields', () => {
  assert.equal(nextVersion('1.10.7', [], 'patch'), '1.10.8');
  assert.equal(nextVersion('1.10.7', [], 'minor'), '1.11.0');
  assert.equal(nextVersion('1.10.7', [], 'major'), '2.0.0');
});

test('current uses the existing package version without incrementing it', () => {
  assert.equal(nextVersion('1.11.0', ['v1.10.0'], 'current'), '1.11.0');
  assert.throws(() => nextVersion('invalid', [], 'current'));
  assert.throws(() => nextVersion('1.11.0', ['v1.12.0'], 'current'), /older than/);
});

test('uses the newest stable package or tag without lexical sorting or prereleases', () => {
  assert.equal(nextVersion('1.9.0', ['v1.10.9', 'v1.9.99', 'v9.0.0-beta.1', 'random'], 'patch'), '1.10.10');
  assert.equal(nextVersion('2.0.0', ['v1.99.99'], 'minor'), '2.1.0');
});

test('rejects unstable, malformed, unsafe, or injected release inputs', () => {
  for (const value of ['1.0.0-beta.1', '01.2.3', '1.2', '1.2.3\n', '1.2.3;echo bad', '9007199254740992.0.0'])
    assert.throws(() => parseVersion(value));
  assert.throws(() => nextVersion('1.0.0', [], 'patch;echo bad'));
  assert.throws(() => nextVersion('1.0.9007199254740991', [], 'patch'));
});

test('version updates preserve all other manifest fields and reject stale inputs', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'dory-release-version-'));
  const file = path.join(directory, 'package.json');
  const manifest = { name: '@clidey/dory', version: '1.10.0', dependencies: { example: '1.0.0' } };
  try {
    writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
    updateVersion(file, '1.10.1', '1.10.0');
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { ...manifest, version: '1.10.1' });
    assert.throws(() => updateVersion(file, '1.10.2', '1.10.0'), /changed after preparation/);
    assert.equal(JSON.parse(readFileSync(file, 'utf8')).version, '1.10.1');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});


test('documentation display version preserves its suffix and existing formatting', () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'dory-release-docs-'));
  const file = path.join(directory, 'dory.json');
  const source = '{\n  "version": "1.10.0 \\u00b7 Latest",\n  "name": "Dory"\n}\n';
  try {
    writeFileSync(file, source);
    updateDocumentationVersion(file, '1.11.0', '1.10.0');
    assert.equal(readFileSync(file, 'utf8'), source.replace('1.10.0', '1.11.0'));
    assert.throws(() => updateDocumentationVersion(file, '1.12.0', '1.10.0'));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('version commits reject non-main branches, stale source, and malformed SHAs', () => {
  const head = 'a'.repeat(40);
  assert.doesNotThrow(() => validateReleaseHead('refs/heads/main', head, head));
  assert.throws(() => validateReleaseHead('refs/heads/feature', head, head), /main/);
  assert.throws(() => validateReleaseHead('refs/heads/main', head, 'b'.repeat(40)), /Main changed/);
  assert.throws(() => validateReleaseHead('refs/heads/main', 'bad', 'bad'));
});


const git = (cwd, ...args) => execFileSync('git', args, {
  cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
}).trim();

function repository(t) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'dory-release-git-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'checkout');
  const remote = path.join(directory, 'remote.git');
  mkdirSync(root);
  git(directory, 'init', '--bare', remote);
  git(root, 'init', '--initial-branch=main');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'config', 'user.email', 'fixture@example.test');
  mkdirSync(path.join(root, 'docs'));
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({
    name: '@clidey/dory', version: '1.10.0', dependencies: { fixture: '1.0.0' },
  }, null, 2) + '\n');
  writeFileSync(path.join(root, 'docs/dory.json'), '{\n  "version": "1.10.0 \\u00b7 Latest",\n  "name": "Dory"\n}\n');
  writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'fixture');
  git(root, 'remote', 'add', 'origin', remote);
  git(root, 'push', 'origin', 'main');
  return { root, remote, source: git(root, 'rev-parse', 'HEAD') };
}

test('commits only tested version metadata and does not push implicitly', t => {
  const { root, source } = repository(t);
  const originalDocs = readFileSync(path.join(root, 'docs/dory.json'), 'utf8');
  const commit = commitVersion(root, {
    previousVersion: '1.10.0', version: '1.10.1', source, bump: 'patch',
  });
  assert.notEqual(commit, source);
  assert.equal(git(root, 'rev-parse', 'HEAD^'), source);
  assert.equal(git(root, 'log', '-1', '--format=%B'), 'chore(release): v1.10.1');
  assert.deepEqual(git(root, 'diff-tree', '--no-commit-id', '--name-only', '-r', commit).split('\n'), ['docs/dory.json', 'package.json']);
  assert.equal(readFileSync(path.join(root, 'docs/dory.json'), 'utf8'), originalDocs.replace('1.10.0', '1.10.1'));
  assert.equal(readFileSync(path.join(root, 'pnpm-lock.yaml'), 'utf8'), 'lockfileVersion: 9.0\n');
  assert.equal(git(root, 'status', '--porcelain'), '');
  assert.equal(git(root, 'ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0], source);
});

test('stale main and full reruns cannot overwrite a recorded release', t => {
  const { root, source } = repository(t);
  const args = { previousVersion: '1.10.0', version: '1.10.1', source, bump: 'patch' };
  const commit = commitVersion(root, args);
  git(root, 'push', 'origin', 'HEAD:main');
  git(root, 'checkout', '--detach', source);
  assert.throws(() => commitVersion(root, args), /Main changed/);
  assert.equal(git(root, 'ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0], commit);
  assert.equal(JSON.parse(readFileSync(path.join(root, 'package.json'))).version, '1.10.0');
  assert.equal(git(root, 'status', '--porcelain'), '');
});

test('rejects dirty source, incorrect SHA, invalid bump, and a mismatched release before mutation', t => {
  const { root, source } = repository(t);
  const args = { previousVersion: '1.10.0', version: '1.10.1', source, bump: 'patch' };
  assert.throws(() => commitVersion(root, { ...args, source: '0'.repeat(40) }), /tested source/);
  assert.throws(() => commitVersion(root, { ...args, version: '9.0.0' }), /tested bump/);
  assert.throws(() => commitVersion(root, { ...args, bump: 'unknown' }), /Choose patch/);
  assert.equal(git(root, 'status', '--porcelain'), '');
  writeFileSync(path.join(root, 'local-work.txt'), 'preserve me');
  assert.throws(() => commitVersion(root, args), /clean checkout/);
  assert.equal(git(root, 'rev-parse', 'HEAD'), source);
  assert.equal(JSON.parse(readFileSync(path.join(root, 'package.json'))).version, '1.10.0');
});

test('current validates main without changing files, creating a commit, or pushing', t => {
  const { root, source } = repository(t);
  const manifest = readFileSync(path.join(root, 'package.json'), 'utf8');
  const docs = readFileSync(path.join(root, 'docs/dory.json'), 'utf8');
  const commit = commitVersion(root, {
    previousVersion: '1.10.0', version: '1.10.0', source, bump: 'current',
  });
  assert.equal(commit, source);
  assert.equal(git(root, 'rev-parse', 'HEAD'), source);
  assert.equal(readFileSync(path.join(root, 'package.json'), 'utf8'), manifest);
  assert.equal(readFileSync(path.join(root, 'docs/dory.json'), 'utf8'), docs);
  assert.equal(git(root, 'status', '--porcelain'), '');
  assert.equal(git(root, 'ls-remote', 'origin', 'refs/heads/main').split(/\s/)[0], source);
});

test('current preparation preserves package and docs metadata byte-for-byte', t => {
  const { root } = repository(t);
  const manifest = readFileSync(path.join(root, 'package.json'), 'utf8');
  const docs = readFileSync(path.join(root, 'docs/dory.json'), 'utf8');
  const output = path.join(path.dirname(root), 'prepare-output');
  execFileSync(process.execPath, [fileURLToPath(new URL('./release-version.mjs', import.meta.url)), 'prepare'], {
    cwd: root,
    env: {
      ...process.env, GITHUB_REF: 'refs/heads/main', BUMP_TYPE: 'current', GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: path.join(path.dirname(root), 'prepare-summary'),
    },
  });
  assert.equal(readFileSync(output, 'utf8'), 'version=1.10.0\nprevious-version=1.10.0\n');
  assert.equal(readFileSync(path.join(root, 'package.json'), 'utf8'), manifest);
  assert.equal(readFileSync(path.join(root, 'docs/dory.json'), 'utf8'), docs);
  assert.equal(git(root, 'status', '--porcelain'), '');
});

test('current rejects mismatched metadata and tags belonging to different source', t => {
  const { root, source } = repository(t);
  const options = { previousVersion: '1.10.0', version: '1.10.0', source, bump: 'current' };
  assert.throws(() => commitVersion(root, { ...options, version: '1.10.1' }), /tested bump/);
  git(root, 'tag', 'v1.10.0');
  assert.equal(commitVersion(root, options), source);
  writeFileSync(path.join(root, 'docs/dory.json'), '{"version":"1.9.0"}\n');
  git(root, 'add', 'docs/dory.json');
  git(root, 'commit', '-m', 'mismatch documentation metadata');
  git(root, 'push', 'origin', 'main');
  const changed = git(root, 'rev-parse', 'HEAD');
  assert.throws(() => commitVersion(root, options), /tested source/);
  assert.throws(() => commitVersion(root, { ...options, source: changed }), /documentation version/);
  writeFileSync(path.join(root, 'docs/dory.json'), '{"version":"1.10.0"}\n');
  git(root, 'add', 'docs/dory.json');
  git(root, 'commit', '-m', 'restore documentation metadata');
  git(root, 'push', 'origin', 'main');
  assert.throws(() => commitVersion(root, { ...options, source: git(root, 'rev-parse', 'HEAD') }), /tag belongs to another commit/);
  assert.equal(git(root, 'status', '--porcelain'), '');
});
