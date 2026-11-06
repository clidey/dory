import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, statSync, symlinkSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const rootMarkers = ['pnpm-workspace.yaml', 'pnpm-lock.yaml', 'package-lock.json', 'npm-shrinkwrap.json', 'yarn.lock', 'bun.lock', 'bun.lockb'];

function isDirectory(path: string): boolean {
  try { return statSync(path).isDirectory(); }
  catch { return false; }
}

function isWorkspaceRoot(directory: string): boolean {
  if (rootMarkers.some(name => existsSync(join(directory, name)))) return true;
  try {
    const manifest: unknown = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
    if (!manifest || typeof manifest !== 'object' || !('workspaces' in manifest)) return false;
    return Array.isArray(manifest.workspaces) || (typeof manifest.workspaces === 'object' && manifest.workspaces !== null);
  } catch { return false; }
}

/** Project-local dependencies take priority over parent workspace dependencies. */
function projectDependencyDirectories(projectRoot: string): string[] {
  const ancestors: string[] = [];
  let fallback: string | undefined;
  let boundary: string | undefined;
  let current = resolve(projectRoot);
  while (true) {
    ancestors.push(current);
    if (!fallback && existsSync(join(current, 'package.json'))) fallback = current;
    if (isWorkspaceRoot(current)) { boundary = current; break; }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  boundary ??= fallback ?? resolve(projectRoot);
  return ancestors.slice(0, ancestors.indexOf(boundary) + 1)
    .map(directory => join(directory, 'node_modules'))
    .filter(isDirectory);
}

/** Enumerate installed packages only, not package-manager metadata or executables. */
function packageDirectories(directory: string): Array<{ name: string; path: string }> {
  const packages: Array<{ name: string; path: string }> = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = join(directory, entry.name);
    if (!isDirectory(path)) continue;
    if (entry.name.startsWith('@')) {
      for (const scoped of readdirSync(path, { withFileTypes: true })) {
        if (scoped.name.startsWith('.')) continue;
        const scopedPath = join(path, scoped.name);
        if (isDirectory(scopedPath) && existsSync(join(scopedPath, 'package.json'))) {
          packages.push({ name: `${entry.name}/${scoped.name}`, path: scopedPath });
        }
      }
    } else if (existsSync(join(path, 'package.json'))) {
      packages.push({ name: entry.name, path });
    }
  }
  return packages;
}

/** Explicit local overrides are build input, never inferred from environment here. */
function packageOverrides(value: string | undefined): Array<{ name: string; path: string }> {
  if (value === undefined) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(value); }
  catch { throw new Error('DORY_PACKAGE_OVERRIDES must be a JSON object mapping package names to absolute package directories'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('DORY_PACKAGE_OVERRIDES must be a JSON object mapping package names to absolute package directories');
  }
  const packages: Array<{ name: string; path: string }> = [];
  for (const [name, target] of Object.entries(parsed)) {
    if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name)) {
      throw new Error(`Invalid package override name: ${name}`);
    }
    if (typeof target !== 'string' || !isAbsolute(target) || !isDirectory(target)) {
      throw new Error(`Package override for ${name} must point to an existing absolute package directory`);
    }
    let manifest: unknown;
    try { manifest = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8')); }
    catch { throw new Error(`Package override for ${name} must contain a readable package.json`); }
    if (!manifest || typeof manifest !== 'object' || !('name' in manifest) || manifest.name !== name) {
      throw new Error(`Package override for ${name} must have a matching package.json name`);
    }
    packages.push({ name, path: realpathSync(target) });
  }
  return packages;
}

/**
 * Expose consuming-project packages without changing or replacing Dory's own
 * toolchain. The overlay lives outside staged docs and never edits installed
 * dependency directories. Package links retain their original dependency trees.
 */
export function createDependencyOverlay(destination: string, doryDependencies: string, projectRoot: string, overridesJson?: string): void {
  const overrides = packageOverrides(overridesJson);
  // Do not traverse an existing node_modules symlink and mutate its target.
  mkdirSync(destination);
  const linked = new Set<string>();
  const linkPackage = (item: { name: string; path: string }) => {
    if (linked.has(item.name)) return;
    const target = join(destination, item.name);
    if (item.name.startsWith('@')) mkdirSync(dirname(target), { recursive: true });
    symlinkSync(realpathSync(item.path), target, 'dir');
    linked.add(item.name);
  };
  // Only an explicit, validated override takes priority over Dory's toolchain.
  for (const item of overrides) linkPackage(item);
  for (const directory of [doryDependencies, ...projectDependencyDirectories(projectRoot)]) {
    for (const item of packageDirectories(directory)) linkPackage(item);
  }
}
