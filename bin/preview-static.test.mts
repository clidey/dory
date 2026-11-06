import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, get, type Server } from 'node:http';
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
  const request = (path: string, method = 'GET') => new Promise<{ status: number; body: string; length?: string }>((resolve, reject) => {
    const req = get({ hostname: '127.0.0.1', port: address.port, path, method }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode!, body, length: res.headers['content-length'] }));
    });
    req.on('error', reject);
  });
  return { root, dist, request };
}

test('serves rebuilt files with fresh content and size', async () => {
  const { dist, request } = await fixture();
  const file = join(dist, 'assets', 'app.js');
  writeFileSync(file, 'first');
  assert.deepEqual(await request('/assets/app.js'), { status: 200, body: 'first', length: '5' });
  writeFileSync(file, 'updated and longer');
  assert.deepEqual(await request('/assets/app.js'), { status: 200, body: 'updated and longer', length: '18' });
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
