import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverSite, isPublicAddress, readRemotePage, screenshot } from './automation';

describe('automation security boundaries', () => {
  const roots: string[] = [];
  afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

  function project() {
    const root = mkdtempSync(join(tmpdir(), 'dory-automation-security-'));
    roots.push(root);
    mkdirSync(join(root, 'dist'));
    writeFileSync(join(root, 'dist', 'index.html'), '<html></html>');
    writeFileSync(join(root, 'dory.json'), '{}');
    return root;
  }

  it('rejects local and private remote documentation URLs before connecting', async () => {
    expect(isPublicAddress('8.8.8.8')).toBe(true);
    expect(isPublicAddress('127.0.0.1')).toBe(false);
    expect(isPublicAddress('::ffff:127.0.0.1')).toBe(false);
    await expect(discoverSite('http://127.0.0.1:8080')).rejects.toThrow('public address');
    await expect(readRemotePage('http://169.254.169.254/latest/secrets.mdx')).rejects.toThrow('public address');
    await expect(readRemotePage('http://[::1]/secret.mdx')).rejects.toThrow('public address');
    await expect(readRemotePage('http://localhost/secret.mdx')).rejects.toThrow('public address');
    await expect(readRemotePage('https://user:password@docs.example.com/page.mdx')).rejects.toThrow('without credentials');
  });

  it('confines screenshot output to project screenshot PNGs', async () => {
    const root = project();
    for (const output of ['../outside.png', '.dory/screenshots/../../dory.json', 'dist/index.html']) {
      await expect(screenshot(root, { output })).rejects.toThrow('inside .dory/screenshots');
    }
    expect(existsSync(join(root, 'dist', 'index.html'))).toBe(true);
  });

  it('rejects screenshot output through a symbolic-link directory', async () => {
    const root = project();
    mkdirSync(join(root, '.dory'));
    const outside = mkdtempSync(join(tmpdir(), 'dory-screenshot-outside-'));
    roots.push(outside);
    symlinkSync(outside, join(root, '.dory', 'screenshots'));
    await expect(screenshot(root, { output: '.dory/screenshots/escape.png' })).rejects.toThrow('symbolic links');
    expect(existsSync(join(outside, 'escape.png'))).toBe(false);
  });

  it('rejects a screenshot output file linked to a missing external file', async () => {
    const root = project();
    const screenshots = join(root, '.dory', 'screenshots');
    mkdirSync(screenshots, { recursive: true });
    const outside = mkdtempSync(join(tmpdir(), 'dory-screenshot-outside-'));
    roots.push(outside);
    symlinkSync(join(outside, 'missing.png'), join(screenshots, 'capture.png'));
    await expect(screenshot(root, { output: '.dory/screenshots/capture.png' })).rejects.toThrow('symbolic links');
    expect(existsSync(join(outside, 'missing.png'))).toBe(false);
  });
});
