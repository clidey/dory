import { describe, it, expect, vi } from 'vitest';
import { createPageLoader } from './page-loader';

describe('page loading', () => {
  it('fetches only the requested page and caches it for synchronous hydration', async () => {
    const first = { default: 'first' };
    const a = vi.fn(async () => first), b = vi.fn(async () => ({ default: 'second' }));
    const pages = createPageLoader({ '/a': a, '/b': b });
    expect(pages.get('/a')).toBeUndefined();
    const request = pages.load('/a');
    expect(pages.load('/a')).toBe(request);
    expect(await request).toBe(first);
    expect(pages.get('/a')).toBe(first);
    expect(await pages.load('/a')).toBe(first);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).not.toHaveBeenCalled();
    expect(await pages.load('/missing')).toBeUndefined();
  });

  it('retries failed downloads without blocking other pages', async () => {
    const a = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('recovered');
    const pages = createPageLoader({ '/a': a, '/b': async () => 'other' });
    await expect(pages.load('/a')).rejects.toThrow('offline');
    expect(await pages.load('/b')).toBe('other');
    expect(await pages.load('/a')).toBe('recovered');
    expect(a).toHaveBeenCalledTimes(2);
  });
});
