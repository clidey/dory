import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, get, type Server, type IncomingHttpHeaders } from 'node:http';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPreviewStatic } from './preview-static.js';

const fixtures: Array<{ root: string; server: Server }> = [];
afterEach(async () => {
  for (const { root, server } of fixtures.splice(0)) {
    await new Promise<void>(resolve => server.close(() => resolve()));
    rmSync(root, { recursive: true, force: true });
  }
});

async function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'dory-preview-static-'));
  const dist = join(root, 'dist');
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'index.html'), 'Public index');
  const serve = createPreviewStatic(dist);
  const server = createServer((req, res) => serve(req, res));
  fixtures.push({ root, server });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const request = (path: string, method = 'GET', headers: Record<string, string> = {}) => new Promise<{ status: number; body: string; length?: string; headers: IncomingHttpHeaders }>((resolve, reject) => {
    const req = get({ hostname: '127.0.0.1', port: address.port, path, method, headers }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode!, body, length: res.headers['content-length'], headers: res.headers }));
    });
    req.on('error', reject);
  });
  return { root, dist, request };
}

test('serves rebuilt files with fresh content and size', async () => {
  const { dist, request } = await fixture();
  const file = join(dist, 'assets', 'app.js');
  writeFileSync(file, 'first');
  const first = await request('/assets/app.js');
  assert.equal(first.status, 200);
  assert.equal(first.body, 'first');
  assert.equal(first.length, '5');
  writeFileSync(file, 'updated and longer');
  const updated = await request('/assets/app.js');
  assert.equal(updated.status, 200);
  assert.equal(updated.body, 'updated and longer');
  assert.equal(updated.length, '18');
});

test('rejects dotfiles, nested hidden files, encoded dots and traversal', async () => {
  const { root, dist, request } = await fixture();
  writeFileSync(join(dist, '.env'), 'Fake private fixture');
  writeFileSync(join(dist, 'assets', '.secret'), 'Fake nested fixture');
  writeFileSync(join(root, 'outside.txt'), 'Fake outside fixture');
  for (const path of ['/.env', '/%2eenv', '/assets/.secret', '/assets/%2esecret', '/assets/%2e%2e/.env', '/assets/../.env', '/../outside.txt', '/%2e%2e/outside.txt', '/%2e%2e%2foutside.txt', '/%5c..%5coutside.txt', '/%00', '/%invalid']) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
    assert.equal(response.body, '', path);
  }
  assert.equal((await request('/index.html')).body, 'Public index');
});

test('rejects symlink files, directory indexes and compressed variants outside dist', async () => {
  const { root, dist, request } = await fixture();
  writeFileSync(join(root, 'outside.txt'), 'Fake outside fixture');
  mkdirSync(join(root, 'outside'));
  writeFileSync(join(root, 'outside', 'index.html'), 'Fake outside index');
  symlinkSync(join(root, 'outside.txt'), join(dist, 'linked.txt'));
  symlinkSync(join(root, 'outside'), join(dist, 'linked-dir'), 'dir');
  symlinkSync(join(root, 'outside.txt'), join(dist, 'assets', 'script.js.br'));
  for (const path of ['/linked.txt', '/linked-dir', '/linked-dir/', '/assets/script.js']) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
    assert.equal(response.body, '', path);
  }
});

test('guards the same reserved-character and fragment paths that sirv resolves', async () => {
  const { root, dist, request } = await fixture();
  writeFileSync(join(root, 'outside.txt'), 'Fake outside fixture');
  for (const name of ['encoded%2Ffile', 'encoded%3Ffile', 'encoded%23file', 'fragment.txt']) {
    symlinkSync(join(root, 'outside.txt'), join(dist, name));
  }
  for (const path of ['/encoded%2Ffile', '/encoded%3Ffile', '/encoded%23file', '/fragment.txt#ignored', '/fragment.txt?ignored=1']) {
    const response = await request(path);
    assert.equal(response.status, 404, path);
    assert.equal(response.body, '', path);
  }
});

test('does not leak a hidden target through an in-tree symlink', async () => {
  const { dist, request } = await fixture();
  writeFileSync(join(dist, '.env'), 'Fake private fixture');
  symlinkSync(join(dist, '.env'), join(dist, 'public.txt'));
  assert.equal((await request('/public.txt')).status, 404);
});

test('keeps custom 404 fallback public and HEAD responses empty', async () => {
  const { root, dist, request } = await fixture();
  writeFileSync(join(dist, '404.html'), 'Public not found');
  assert.equal((await request('/missing')).body, 'Public not found');
  assert.equal((await request('/missing', 'HEAD')).body, '');
  rmSync(join(dist, '404.html'));
  writeFileSync(join(root, 'outside.html'), 'Fake outside fallback');
  symlinkSync(join(root, 'outside.html'), join(dist, '404.html'));
  assert.equal((await request('/missing')).body, 'Page not found');
});

test('supports public unicode and extensionless routes without changing request routing', async () => {
  const { dist, request } = await fixture();
  mkdirSync(join(dist, 'guide'));
  writeFileSync(join(dist, 'guide', 'index.html'), 'Public guide');
  writeFileSync(join(dist, 'assets', 'café.txt'), 'Public unicode');
  assert.equal((await request('/guide?search=example')).body, 'Public guide');
  assert.equal((await request('/assets/caf%C3%A9.txt')).body, 'Public unicode');
  assert.equal((await request('/index.html', 'HEAD')).body, '');
});

test('negotiates compressed assets while caching only fingerprinted files', async () => {
  const { dist, request } = await fixture();
  const name = '/assets/page-Ab12Cd34.js';
  const source = 'export const documentation = "Fast and readable";'.repeat(100);
  writeFileSync(join(dist, name), source);
  writeFileSync(join(dist, name + '.gz'), gzipSync(source));
  writeFileSync(join(dist, name + '.br'), brotliCompressSync(source));
  const plain = await request(name);
  assert.equal(plain.body, source);
  assert.equal(plain.headers['content-encoding'], undefined);
  assert.equal(plain.headers['cache-control'], 'public, max-age=31536000, immutable');
  for (const encoding of ['gzip', 'br']) {
    const response = await request(name, 'GET', { 'accept-encoding': encoding });
    assert.equal(response.headers['content-encoding'], encoding);
    assert.match(response.headers['content-type']!, /javascript/);
    assert.equal(response.headers.vary, 'Accept-Encoding');
    assert.ok(Number(response.length) < source.length);
    assert.equal((await request(name, 'HEAD', { 'accept-encoding': encoding })).body, '');
    const cached = await request(name, 'GET', { 'accept-encoding': encoding, 'if-none-match': response.headers.etag! });
    assert.equal(cached.status, 304);
    assert.equal(cached.headers.vary, 'Accept-Encoding');
    assert.equal(cached.headers['cache-control'], plain.headers['cache-control']);
  }
  assert.equal((await request('/')).headers['cache-control'], 'no-cache');
  assert.equal((await request('/assets/missing-Ab12Cd34.js')).headers['cache-control'], 'no-store');
});
