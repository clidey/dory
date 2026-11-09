import assert from 'node:assert/strict';
import test from 'node:test';
import { assertExactPackage, publishedVersion, waitForPublishedVersion } from './npm-registry.mjs';

const version = '1.11.0';
const integrity = 'sha512-tested-artifact';
const metadata = { version, dist: { integrity } };
const response = (status, body = {}) => new Response(JSON.stringify(body), { status });

test('uses unique cache keys and falls back to the package index after a version 404', async () => {
  const urls = [];
  const options = [];
  const fetchImpl = async (url, request) => {
    urls.push(String(url)); options.push(request);
    return urls.length === 1 ? response(404) : response(200, { versions: { [version]: metadata } });
  };
  let nonce = 0;
  assert.deepEqual(await publishedVersion(version, { fetchImpl, nonce: () => String(++nonce) }), metadata);
  assert.match(urls[0], /@clidey%2Fdory\/1\.11\.0\?dory-release-check=1$/);
  assert.match(urls[1], /@clidey%2Fdory\?dory-release-check=2$/);
  assert.match(options[0].headers['Cache-Control'], /no-store/);
  assert.ok(options[0].signal);
});

test('returns absent only when neither metadata endpoint contains the version', async () => {
  assert.equal(await publishedVersion(version, { fetchImpl: async () => response(404) }), null);
  assert.deepEqual(await publishedVersion(version, { fetchImpl: async () => response(200, metadata) }), metadata);
  assert.equal(await publishedVersion(version, {
    fetchImpl: async url => String(url).includes('/1.11.0?') ? response(404) : response(200, { versions: {} }),
  }), null);
});

test('retries propagation delays, rate limits and transient network failures', async () => {
  let clock = 0;
  let calls = 0;
  const urls = new Set();
  const fetchImpl = async url => {
    urls.add(String(url));
    calls++;
    if (calls <= 2) return response(404);
    if (calls === 3) return response(429);
    if (calls === 4) throw new TypeError('connection reset');
    return response(200, metadata);
  };
  await waitForPublishedVersion(version, integrity, {
    fetchImpl, now: () => clock, sleep: async ms => { clock += ms; },
    timeoutMs: 100, intervalMs: 10, log: () => {},
  });
  assert.equal(calls, 5);
  assert.equal(urls.size, calls);
});

test('fails immediately on a wrong version or checksum without retrying', async () => {
  assert.throws(() => assertExactPackage({ ...metadata, version: '1.12.0' }, version, integrity), /different checksum/);
  let calls = 0;
  await assert.rejects(waitForPublishedVersion(version, integrity, {
    fetchImpl: async () => { calls++; return response(200, { version, dist: { integrity: 'sha512-other' } }); },
    sleep: () => { throw new Error('Must not retry a different package'); }, log: () => {},
  }), /different checksum/);
  assert.equal(calls, 1);
});

test('does not treat authorization errors as registry propagation', async () => {
  await assert.rejects(waitForPublishedVersion(version, integrity, {
    fetchImpl: async () => response(403), sleep: () => { throw new Error('Must not retry'); }, log: () => {},
  }), /HTTP 403/);
});

test('bounds polling and explains that successful publication can be retried safely', async () => {
  let clock = 0;
  let waits = 0;
  await assert.rejects(waitForPublishedVersion(version, integrity, {
    fetchImpl: async () => response(404), now: () => clock,
    sleep: async ms => { clock += ms; waits++; }, timeoutMs: 25, intervalMs: 10, log: () => {},
  }), /Publication may have succeeded; re-run failed jobs/);
  assert.equal(clock, 25);
  assert.equal(waits, 3);
});

test('rejects invalid version inputs before requesting metadata', async () => {
  await assert.rejects(publishedVersion('1.11.0/../../other'), /stable package version/);
});
