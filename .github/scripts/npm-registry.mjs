import { appendFileSync, readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

class RegistryError extends Error {
  constructor(message, retryable) {
    super(message);
    this.retryable = retryable;
  }
}

function validateVersion(version) {
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
    throw new Error('Expected a stable package version.');
}

/** Query fresh cache keys; fall back to the package index if the version endpoint lags. */
export async function publishedVersion(version, { fetchImpl = fetch, nonce = randomUUID } = {}) {
  validateVersion(version);
  const request = async suffix => {
    const url = new URL(`https://registry.npmjs.org/@clidey%2Fdory${suffix}`);
    url.searchParams.set('dory-release-check', nonce());
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache', Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
    } catch (error) {
      throw new RegistryError(`npm metadata request failed: ${error.message}`, true);
    }
    if (response.status === 404) return null;
    if (!response.ok) throw new RegistryError(`npm metadata request returned HTTP ${response.status}`, response.status === 429 || response.status >= 500);
    try {
      return await response.json();
    } catch (error) {
      throw new RegistryError(`npm metadata response could not be read: ${error.message}`, true);
    }
  };
  const direct = await request(`/${version}`);
  if (direct) return direct;
  const index = await request('');
  return index?.versions?.[version] ?? null;
}

export function assertExactPackage(metadata, version, integrity) {
  if (metadata.version !== version || metadata.dist?.integrity !== integrity)
    throw new Error(`npm ${version} has a different checksum from the tested artifact. Published versions cannot be overwritten.`);
}

export async function waitForPublishedVersion(version, integrity, {
  fetchImpl = fetch, nonce = randomUUID, sleep = setTimeout, now = Date.now,
  timeoutMs = 600000, intervalMs = 10000, log = console.log,
} = {}) {
  validateVersion(version);
  const deadline = now() + timeoutMs;
  let last = 'Version is absent from npm metadata.';
  let attempt = 0;
  while (now() < deadline) {
    let metadata;
    try {
      metadata = await publishedVersion(version, { fetchImpl, nonce });
      if (!metadata) last = 'Version is absent from npm metadata.';
    } catch (error) {
      if (!(error instanceof RegistryError) || !error.retryable) throw error;
      last = error.message;
    }
    if (metadata) {
      assertExactPackage(metadata, version, integrity);
      log(`Verified @clidey/dory@${version}: published checksum matches the tested artifact.`);
      return;
    }
    log(`Waiting for npm metadata for ${version} (attempt ${++attempt}): ${last}`);
    const remaining = deadline - now();
    if (remaining > 0) await sleep(Math.min(intervalMs, remaining));
  }
  throw new Error(`Could not verify @clidey/dory@${version} within ${timeoutMs / 1000}s. ${last} Publication may have succeeded; re-run failed jobs to verify the same artifact.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = process.env.PACKAGE_VERSION;
  validateVersion(version);
  const artifact = resolve(dirname(fileURLToPath(import.meta.url)), `clidey-dory-${version}.tgz`);
  const integrity = 'sha512-' + createHash('sha512').update(readFileSync(artifact)).digest('base64');
  if (process.argv[2] === 'check') {
    if (!process.env.GITHUB_ENV) throw new Error('GITHUB_ENV must be set by the release workflow.');
    const metadata = await publishedVersion(version);
    if (metadata) assertExactPackage(metadata, version, integrity);
    appendFileSync(process.env.GITHUB_ENV, `DORY_ALREADY_PUBLISHED=${Boolean(metadata)}\n`);
  } else if (process.argv[2] === 'wait') {
    await waitForPublishedVersion(version, integrity);
  } else throw new Error('Use check or wait.');
}
