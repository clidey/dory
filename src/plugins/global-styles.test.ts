import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build, normalizePath } from 'vite';
import { globalStylesPlugin } from './global-styles';
import tailwindcss from '@tailwindcss/vite';

const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true }));
});

describe('global styles module', () => {
  it('imports configured CSS in order and watches configuration changes', () => {
    const root = mkdtempSync(join(tmpdir(), 'dory-global-styles-'));
    roots.push(root);
    mkdirSync(join(root, 'docs'));
    const config = join(root, 'docs/dory.json');
    writeFileSync(config, JSON.stringify({ styles: ['./first.css', './second.css'] }));
    for (const name of ['first.css', 'second.css']) writeFileSync(join(root, 'docs', name), 'body {}');
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    const plugin = globalStylesPlugin();
    const resolveId = plugin.resolveId as (id: string) => string | undefined;
    const id = resolveId('virtual:dory-styles')!;
    expect(resolveId('other-module')).toBeUndefined();
    const addWatchFile = vi.fn();
    const load = plugin.load as unknown as (this: { addWatchFile: typeof addWatchFile }, id: string) => string | undefined;
    const code = load.call({ addWatchFile }, id)!;
    expect(code.split('\n').map(line => line.match(/docs\/(.*?).css/)?.[1])).toEqual(['first', 'second']);
    expect(addWatchFile).toHaveBeenCalledWith(normalizePath(config));
    writeFileSync(config, '{}');
    expect(load.call({ addWatchFile }, id)).toBe('');
  });

  it('revalidates CSS edits before Vite can transform a newly unsafe dependency', () => {
    const root = mkdtempSync(join(tmpdir(), 'dory-global-styles-hmr-'));
    roots.push(root);
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'docs/dory.json'), JSON.stringify({ styles: ['first.css'] }));
    const css = join(root, 'docs/first.css');
    writeFileSync(css, '@import "second.css";');
    writeFileSync(join(root, 'docs/second.css'), 'body {}');
    writeFileSync(join(root, 'private.css'), '.private { color: red; }');
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    const plugin = globalStylesPlugin();
    const load = plugin.load as unknown as (this: { addWatchFile: ReturnType<typeof vi.fn> }, id: string) => string;
    const transform = plugin.transform as unknown as (this: { addWatchFile: ReturnType<typeof vi.fn> }, code: string, id: string) => void;
    const context = { addWatchFile: vi.fn() };
    load.call(context, '\0virtual:dory-styles');
    writeFileSync(join(root, 'docs/second.css'), '@import "../private.css";');
    expect(() => transform.call(context, '', realpathSync(css))).toThrow('must stay inside');
    expect(() => transform.call(context, '', realpathSync(join(root, 'docs/second.css')))).toThrow('must stay inside');
  });

  it('rejects outside references in a real Vite build rather than publishing their bytes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'dory-global-styles-build-'));
    roots.push(root);
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'docs/dory.json'), JSON.stringify({ styles: ['custom.css'] }));
    writeFileSync(join(root, 'docs/custom.css'), 'body { background: url("../private.txt"); }');
    writeFileSync(join(root, 'private.txt'), 'PRIVATE-TEST-CONTENT');
    writeFileSync(join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
    writeFileSync(join(root, 'main.js'), 'import "virtual:dory-styles";');
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    await expect(build({ configFile: false, root, plugins: [globalStylesPlugin()], logLevel: 'silent' }))
      .rejects.toThrow('public raster image or font');
  });

  it.each(['reference', 'plugin'])('blocks @%s before Tailwind can read or import its target', async directive => {
    const root = mkdtempSync(join(tmpdir(), 'dory-global-styles-tailwind-'));
    roots.push(root);
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'docs/dory.json'), JSON.stringify({ styles: ['custom.css'] }));
    // The plugin path deliberately does not exist: no JavaScript is executed.
    const target = directive === 'plugin' ? '../never-execute.js' : '../private.css';
    writeFileSync(join(root, 'docs/custom.css'), `@${directive} "${target}";`);
    writeFileSync(join(root, 'private.css'), '.private { --secret: "PRIVATE-TEST-CONTENT"; }');
    writeFileSync(join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
    writeFileSync(join(root, 'main.js'), 'import "virtual:dory-styles";');
    vi.spyOn(process, 'cwd').mockReturnValue(root);
    await expect(build({ configFile: false, root, plugins: [globalStylesPlugin(), tailwindcss()], logLevel: 'silent' }))
      .rejects.toThrow(`CSS does not support @${directive}`);
  });
});
