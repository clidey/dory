import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, access, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, gunzipSync, brotliDecompressSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compressStaticFiles } from './compress-static.mjs';

test('compresses nested text losslessly and skips images, small files and symlinks', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dory-compression-test-'));
  try {
    await mkdir(join(root, 'assets'));
    const text = 'Readable documentation with searchable content.\n'.repeat(200);
    await writeFile(join(root, 'assets', 'page.js'), text);
    await writeFile(join(root, 'small.txt'), 'Small');
    await writeFile(join(root, 'image.webp'), text);
    await symlink(join(root, 'assets'), join(root, 'linked'));
    assert.equal(await compressStaticFiles(root), 1);
    assert.equal(gunzipSync(await readFile(join(root, 'assets', 'page.js.gz'))).toString(), text);
    assert.equal(brotliDecompressSync(await readFile(join(root, 'assets', 'page.js.br'))).toString(), text);
    assert.equal(await readFile(join(root, 'assets', 'page.js'), 'utf8'), text);
    await assert.rejects(access(join(root, 'small.txt.br')));
    await assert.rejects(access(join(root, 'image.webp.br')));
    await writeFile(join(root, 'assets', 'page.js.gz'), gzipSync('stale'));
    await compressStaticFiles(root);
    assert.equal(gunzipSync(await readFile(join(root, 'assets', 'page.js.gz'))).toString(), text);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('runs the CLI through a symlink, as it does in isolated consumer workspaces', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dory-compression-cli-'));
  try {
    const script = join(root, 'compress.mjs');
    await symlink(fileURLToPath(new URL('./compress-static.mjs', import.meta.url)), script);
    await writeFile(join(root, 'index.html'), '<p>Documentation</p>'.repeat(200));
    const output = execFileSync(process.execPath, [script, root], { encoding: 'utf8' });
    assert.match(output, /Precompressed 1 static text files/);
    await access(join(root, 'index.html.br'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
