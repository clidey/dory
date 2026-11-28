import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const config = JSON.parse(readFileSync(new URL('../docs/dory.json', import.meta.url), 'utf8'));
const base = String(config.basePath || '').replace(/\/$/, '');
const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const requests = [], errors = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const paragraph = document.querySelector('.dory-article p.mb-2');
      if (!window.__doryInitialParagraph && paragraph) window.__doryInitialParagraph = paragraph;
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  await page.goto(`${origin}${base}/`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Introduction', exact: true }).first().waitFor();
  // The former background indexing timer ran after two seconds.
  await page.waitForTimeout(2400);
  assert(!requests.some(url => /search-content\.json|flexsearch/i.test(url)), 'Search must stay unloaded before use');
  assert(!requests.some(url => /automation-[\w-]+\.js/.test(url)), 'Unvisited page modules must stay unloaded');
  assert.equal(await page.locator('.dory-article').count(), 1, 'Hydration must preserve a single article');
  assert(await page.evaluate(() => window.__doryInitialParagraph?.isConnected), 'Root redirect must preserve the prerendered paragraph');
  await page.locator(`a[href="${base}/getting-started/automation"]`).first().click();
  await page.getByRole('heading', { name: 'CLI and MCP automation', exact: true }).first().waitFor();
  assert(requests.some(url => /automation-[\w-]+\.js/.test(url)), 'Navigation must fetch its page module');
  await page.goBack();
  await page.getByRole('heading', { name: 'Introduction', exact: true }).first().waitFor();
  await page.keyboard.press('ControlOrMeta+k');
  const search = page.getByRole('combobox').locator('input');
  await search.waitFor();
  await search.fill('automation');
  await page.getByRole('option').filter({ hasText: /automation/i }).first().waitFor();
  assert(requests.some(url => /search-content\.json/.test(url)), 'Search must download content when used');
  // This page's body never repeats its title, so only the title can match.
  await search.fill('Contributing to Dory');
  await page.getByRole('option').filter({ hasText: 'Contributing to Dory' }).first().waitFor();
  await page.keyboard.press('Escape');
  await page.goto(`${origin}${base}/components/images`, { waitUntil: 'networkidle' });
  const image = page.getByRole('button', { name: /Enlarge image/ }).first();
  await image.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor();
  await page.waitForFunction(() => document.querySelector('[role=dialog]')?.contains(document.activeElement));
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert(await image.evaluate(element => element === document.activeElement), 'Closing image preview must restore keyboard focus');
  await page.goto(`${origin}${base}/page-that-does-not-exist`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Go to home' }).waitFor();
  assert.deepEqual(errors, [], 'Navigation and hydration must not throw browser errors');
  const noJS = await browser.newPage({ javaScriptEnabled: false });
  await noJS.goto(`${origin}${base}/getting-started/automation/index.html`);
  await noJS.getByRole('heading', { name: 'CLI and MCP automation', exact: true }).first().waitFor();
  await noJS.close();
  console.log('Page splitting, hydration, navigation, on-demand search, search by page title, image keyboard access, 404 and no-JavaScript content passed.');
} finally {
  await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
