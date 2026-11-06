import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const root = process.cwd();
const require = createRequire(`${root}/package.json`);
const { createServer } = await import(require.resolve('vite'));
const { chromium } = require('playwright-core');

// Inject regression fixtures without changing any documentation source files.
const server = await createServer({
  configFile: `${root}/vite.config.ts`,
  plugins: [{
    name: 'failure-regression-fixtures',
    enforce: 'pre',
    transform(_source, id) {
      if (id.endsWith('/docs/components/accordion.mdx')) {
        return '# Accordion\n\n{(() => { throw new Error("Intentional page failure") })()}';
      }
      if (id.endsWith('/docs/components/cards.mdx')) {
        return '# Cards\n\n<Icon icon="line-chart" />\n\n<Icon icon="this-icon-does-not-exist" />\n\nHealthy page with icons.';
      }
    },
  }],
  server: { host: '127.0.0.1', port: 0 },
});

await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(`${server.resolvedUrls.local[0]}components/accordion`);
  await page.getByText('Intentional page failure', { exact: true }).waitFor();
  await page.evaluate(() => { window.__navigationMarker = 'preserved'; });

  await page.locator('.dory-sidebar').getByRole('link', { name: 'Cards', exact: true }).click();
  await page.getByText('Healthy page with icons.').waitFor();
  assert.equal(await page.getByText('This page failed to render', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => window.__navigationMarker), 'preserved');
  assert.ok(await page.locator('.dory-article svg[style*="mask"]').count() >= 2);

  await page.locator('.dory-sidebar').getByRole('link', { name: 'Accordion', exact: true }).click();
  await page.getByText('Intentional page failure', { exact: true }).waitFor();
  await page.locator('.dory-sidebar').getByRole('link', { name: 'Code Blocks', exact: true }).click();
  await page.locator('h1.dory-page-title').filter({ hasText: 'Code Blocks' }).waitFor();
  assert.equal(await page.getByText('This page failed to render', { exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => window.__navigationMarker), 'preserved');

  console.log('Page failure recovery and legacy/unknown icon rendering passed without reloading.');
} finally {
  await browser.close();
  await server.close();
}
