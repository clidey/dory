import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { renderSocialPreview } from '../src/plugins/social-preview.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(resolve(root, 'docs/dory.json'), 'utf8'));
const pages = JSON.parse(readFileSync(resolve(root, 'dist/frontmatter.json'), 'utf8'));
const first = pages[0], target = pages.find(page => page.path === '/configuration/seo');
const output = resolve(root, '.dory/seo-review');
mkdirSync(output, { recursive: true });
let server, browser;
try {
  server = await preview({ root, preview: { host: '127.0.0.1', port: 3191, strictPort: true } });
  const base = server.resolvedUrls.local[0];
  browser = await chromium.launch({ channel: 'chrome', headless: true, ...(process.env.DORY_CHROME_PATH ? { executablePath: process.env.DORY_CHROME_PATH } : {}) });
  const canonical = path => `${config.url}${config.basePath || ''}${path}`;
  for (const mode of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: mode });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL(`${first.path.slice(1)}/?utm_source=seo-test#content`, base).href);
    await page.waitForFunction(url => document.querySelector('link[rel="canonical"]')?.href === url, canonical(first.path));
    const before = await page.evaluate(() => ({ image: document.querySelector('meta[property="og:image"]')?.content, title: document.title }));
    await page.locator(`a[href="${config.basePath || ''}${target.path}"]`).first().click();
    await page.waitForFunction(url => document.querySelector('link[rel="canonical"]')?.href === url, canonical(target.path));
    const after = await page.evaluate(() => ({
      title: document.title,
      image: document.querySelector('meta[property="og:image"]')?.content,
      twitterImage: document.querySelector('meta[name="twitter:image"]')?.content,
      description: document.querySelector('meta[name="description"]')?.content,
      ogTitle: document.querySelector('meta[property="og:title"]')?.content,
      url: document.querySelector('meta[property="og:url"]')?.content,
      schemas: [...document.querySelectorAll('script[data-dory-seo]')].map(script => JSON.parse(script.textContent)),
    }));
    assert.equal(after.url, canonical(target.path));
    assert.equal(after.title, after.ogTitle);
    assert.notEqual(before.image, after.image);
    assert.equal(after.image, after.twitterImage);
    assert.equal(after.image, canonical(target._dorySocialImage));
    assert.equal(after.description, target.description);
    assert.equal(after.schemas.length, 1);
    assert.ok(after.schemas[0]['@graph'].some(node => node['@type'] === 'WebPage' && node.url === canonical(target.path)));
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: resolve(output, `docs-${mode}.png`), fullPage: false });
    await page.goto(new URL('missing-social-preview-check', base).href);
    await page.waitForFunction(() => document.querySelector('meta[property="og:image"]')?.content.endsWith('/_dory/social/not-found.png'));
    const notFound = await page.evaluate(() => ({
      image: document.querySelector('meta[property="og:image"]')?.content,
      secureImage: document.querySelector('meta[property="og:image:secure_url"]')?.content,
      twitterImage: document.querySelector('meta[name="twitter:image"]')?.content,
      robots: document.querySelector('meta[name="robots"]')?.content,
      canonical: document.querySelector('link[rel="canonical"]')?.href,
    }));
    assert.equal(notFound.image, canonical('/_dory/social/not-found.png'));
    assert.equal(notFound.image, notFound.secureImage);
    assert.equal(notFound.image, notFound.twitterImage);
    assert.match(notFound.robots, /noindex/);
    assert.equal(notFound.canonical, undefined);
    const imageResponse = await context.request.get(new URL(new URL(notFound.image).pathname, base).href);
    assert.equal(imageResponse.status(), 200);
    assert.equal((await imageResponse.body()).readUInt32BE(16), 1200);
    assert.deepEqual(errors, []);
    await context.close();
    await renderSocialPreview({ route: '/', title: 'Documentation that feels like your product.', description: 'Fast, searchable MDX docs. Your fonts. Your colors. Your brand.', config: { ...config, seo: { ...config.seo, socialImageTheme: mode } }, docsDir: resolve(root, 'docs'), outDir: resolve(output, mode) });
  }
  console.log(`SEO browser checks passed in light and dark modes. Review images: ${output}`);
} finally {
  await browser?.close();
  await server?.httpServer.close();
}
