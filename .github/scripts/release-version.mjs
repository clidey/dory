import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const git = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();

const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function parseVersion(version) {
  if (typeof version !== 'string' || version !== version.trim() || !stable.test(version))
    throw new Error('Expected a stable version in X.Y.Z form.');
  const parts = version.split('.').map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error('Version numbers exceed safe limits.');
  return parts;
}

export function nextVersion(current, tags, bump) {
  if (!['current', 'patch', 'minor', 'major'].includes(bump)) throw new Error('Choose patch, minor, major, or current.');
  let base = parseVersion(current);
  for (const tag of tags) {
    if (!/^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(tag)) continue;
    const candidate = parseVersion(tag.slice(1));
    const difference = candidate.findIndex((part, index) => part !== base[index]);
    if (difference !== -1 && candidate[difference] > base[difference]) base = candidate;
  }
  if (bump === 'current') {
    if (base.join('.') !== current) throw new Error('The current package version is older than an existing release tag. Update it before releasing.');
    return current;
  }
  const index = { major: 0, minor: 1, patch: 2 }[bump];
  base[index] += 1;
  for (let i = index + 1; i < base.length; i++) base[i] = 0;
  const version = base.join('.');
  parseVersion(version);
  return version;
}

export function updateVersion(file, version, previousVersion) {
  parseVersion(version);
  parseVersion(previousVersion);
  const source = readFileSync(file, 'utf8');
  const manifest = JSON.parse(source);
  if (manifest.version !== previousVersion) throw new Error('The package version changed after preparation.');
  manifest.version = version;
  writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}

function documentationVersionSource(file, previousVersion) {
  parseVersion(previousVersion);
  const source = readFileSync(file, 'utf8');
  const config = JSON.parse(source);
  if (typeof config.version !== 'string' ||
      config.version.match(/^(\d+\.\d+\.\d+)(?:\s|$)/)?.[1] !== previousVersion)
    throw new Error('The documentation version does not match the prepared package.');
  return source;
}

export function updateDocumentationVersion(file, version, previousVersion) {
  parseVersion(version);
  const source = documentationVersionSource(file, previousVersion);
  // Preserve escaped branding text and the rest of the config byte-for-byte.
  writeFileSync(file, source.replace(/("version"\s*:\s*")(\d+\.\d+\.\d+)/,
    (_match, prefix) => prefix + version));
}

export function validateReleaseHead(ref, expected, actual) {
  if (ref !== 'refs/heads/main') throw new Error('Releases must run from main.');
  if (!/^[a-f0-9]{40}$/.test(expected) || actual !== expected)
    throw new Error('Main changed after this release started. Start a new release workflow run.');
}

export function commitVersion(root, { version, previousVersion, source, bump }) {
  parseVersion(version);
  parseVersion(previousVersion);
  if (!/^[a-f0-9]{40}$/.test(source || '')) throw new Error('Expected the dispatch commit SHA.');
  if (git(root, 'status', '--porcelain')) throw new Error('Version commit requires a clean checkout.');
  if (git(root, 'rev-parse', 'HEAD') !== source) throw new Error('Checkout does not match the tested source.');
  git(root, 'fetch', 'origin', 'refs/heads/main:refs/remotes/origin/main');
  validateReleaseHead('refs/heads/main', source, git(root, 'rev-parse', 'origin/main'));
  const packageFile = resolve(root, 'package.json');
  if (JSON.parse(readFileSync(packageFile, 'utf8')).version !== previousVersion)
    throw new Error('The source version changed.');
  const expected = nextVersion(previousVersion, git(root, 'tag', '--list', 'v*').split('\n'), bump);
  if (version !== expected) throw new Error('The release version does not match the tested bump.');
  if (bump === 'current') {
    documentationVersionSource(resolve(root, 'docs/dory.json'), version);
    const tag = `v${version}`;
    if (git(root, 'tag', '--list', tag) && git(root, 'rev-parse', `${tag}^{commit}`) !== source)
      throw new Error('The current version tag belongs to another commit. Choose a new version.');
    return source;
  }
  updateVersion(packageFile, version, previousVersion);
  updateDocumentationVersion(resolve(root, 'docs/dory.json'), version, previousVersion);
  git(root, 'config', 'user.name', 'github-actions[bot]');
  git(root, 'config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
  git(root, 'add', '--', 'package.json', 'docs/dory.json');
  git(root, 'diff', '--cached', '--check');
  git(root, 'commit', '-m', `chore(release): v${version}`);
  return git(root, 'rev-parse', 'HEAD');
}

function output(name, value) {
  if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT must be set by the release workflow.');
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const previousVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;
  if (process.argv[2] === 'prepare') {
    if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Releases must run from main.');
    const tags = execFileSync('git', ['tag', '--list', 'v*'], { encoding: 'utf8' }).trim().split('\n');
    const version = nextVersion(previousVersion, tags, process.env.BUMP_TYPE);
    if (process.env.BUMP_TYPE === 'current') {
      documentationVersionSource('docs/dory.json', version);
    } else {
      updateVersion('package.json', version, previousVersion);
      updateDocumentationVersion('docs/dory.json', version, previousVersion);
    }
    output('version', version);
    output('previous-version', previousVersion);
    if (process.env.GITHUB_STEP_SUMMARY)
      appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Release: ${previousVersion} → **${version}** (${process.env.BUMP_TYPE})\n`);
  } else if (process.argv[2] === 'commit') {
    if (process.env.GITHUB_REF !== 'refs/heads/main') throw new Error('Releases must run from main.');
    const commit = commitVersion(process.cwd(), {
      version: process.env.PACKAGE_VERSION,
      previousVersion: process.env.PREVIOUS_VERSION,
      source: process.env.GITHUB_SHA,
      bump: process.env.BUMP_TYPE,
    });
    output('commit', commit);
  } else throw new Error('Use prepare or commit.');
}
