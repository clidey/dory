import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {preview} from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(join(root, 'docs/dory.json'), 'utf8'));
const routes = config.navigation.tabs.flatMap(tab => tab.groups.flatMap(group => group.pages))
  .map(page => typeof page === 'string' ? page : page.page).filter(page => page.startsWith('components/'));
const output = join(root, '.dory/component-review');
await mkdir(output, {recursive: true});
const report = {pages: 0, previews: 0, errors: [], screenshots: []};
let server;
let browser;
try {
  let base = process.argv[2];
  if (!base) {
    server = await preview({root, preview: {host: '127.0.0.1', port: 3189, strictPort: true}});
    base = server.resolvedUrls.local[0];
  }
  if (!base.endsWith('/')) base += '/';
  browser = await chromium.launch({channel: 'chrome', headless: true, ...(process.env.DORY_CHROME_PATH ? {executablePath: process.env.DORY_CHROME_PATH} : {})});
  // A missing lazy math asset must leave a readable equation and an error, not
  // a blank spinner. This context has its own cache so the request is real.
  const unavailable = await browser.newContext({viewport: {width: 390, height: 844}});
  const failedMath = await unavailable.newPage();
  await failedMath.route(/\/assets\/katex-[^/]+\.js$/, route => route.abort());
  await failedMath.goto(new URL('components/latex/', base).href, {waitUntil: 'domcontentloaded'});
  await failedMath.getByRole('alert').filter({hasText: 'The equation could not be rendered.'}).first().waitFor();
  assert.ok((await failedMath.locator('[data-latex-fallback]').first().innerText()).trim(), 'Failed math retains readable content');
  assert.equal(await failedMath.locator('.dory-latex .animate-spin').count(), 0, 'Failed math does not spin forever');
  await unavailable.close();
  report.mathFailureFallback = true;
  for (const scenario of [
    {name: 'desktop-dark', viewport: {width: 1440, height: 1000}, colorScheme: 'dark'},
    {name: 'mobile-light', viewport: {width: 390, height: 844}, colorScheme: 'light'},
  ]) {
    const context = await browser.newContext({viewport: scenario.viewport, colorScheme: scenario.colorScheme});
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(`${scenario.name}: ${error.message}`));
    for (const route of routes) {
      const label = `${scenario.name} ${route}`;
      try {
        const response = await page.goto(new URL(route + '/', base).href, {waitUntil: 'domcontentloaded'});
        assert.equal(response.status(), 200, `${label}: HTTP status`);
        await page.locator('article').waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.getByText('This page failed to render', {exact: true}).count(), 0, `${label}: render boundary`);
        const previews = page.locator('[data-dory-preview]:visible');
        assert.equal(await previews.count(), await page.locator('.dory-specimen:visible').count(), `${label}: every example has a visible preview`);
        for (let index = 0; index < await previews.count(); index++) {
          const panel = previews.nth(index);
          const padding = await panel.evaluate(element => {
            const style = getComputedStyle(element);
            return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(parseFloat);
          });
          const expected = await panel.getAttribute('data-padding');
          assert.ok(padding.every(value => expected === 'none' ? value === 0 : value >= 16), `${label} preview ${index + 1}: missing inset (${padding})`);
          const clipped = await panel.evaluate(element => {
            const box = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            const left = box.left + parseFloat(style.paddingLeft);
            const right = box.right - parseFloat(style.paddingRight);
            return [...element.querySelectorAll('.dory-latex, .dory-expandable, .dory-accordion, .dory-table, .dory-card, .dory-callout')]
              .filter(child => child.getBoundingClientRect().width > 0)
              .filter(child => { const bounds = child.getBoundingClientRect(); return bounds.left < left - 1 || bounds.right > right + 1; })
              .map(child => child.className);
          });
          assert.deepEqual(clipped, [], `${label} preview ${index + 1}: content clipped by frame`);
          report.previews++;
        }
        if (route === 'components/latex') {
          await page.waitForFunction(() => {
            const formulas = [...document.querySelectorAll('.dory-latex, .dory-latex-inline')];
            return formulas.length > 0 && formulas.every(element => element.querySelector('.katex'));
          }, undefined, {timeout: 15000});
          assert.equal(await page.locator('[data-latex-fallback]').count(), 0, `${label}: math still loading`);
          assert.equal(await page.locator('.katex-error').count(), 0, `${label}: invalid formula`);
        }
        if (route === 'components/typography') {
          assert.equal(await page.locator('.dory-type-scale > div').count(), 4, `${label}: heading samples`);
          assert.equal(await page.locator('.dory-type-scale').evaluate(element => element.scrollWidth > element.clientWidth + 1), false, `${label}: heading sample overflows`);
        }
        if (route === 'components/expandable') {
          const specimen = page.locator('.dory-specimen').first();
          const inner = specimen.locator('.dory-expandable').first();
          const outerBounds = await specimen.boundingBox();
          const innerBounds = await inner.boundingBox();
          assert.ok(innerBounds.x - outerBounds.x >= 16, `${label}: nested border touches frame`);
          await inner.getByRole('button', {name: 'Response Body', exact: true}).click();
          await inner.locator('[data-state="open"]').first().waitFor();
        }
        const specimen = page.locator('.dory-specimen').first();
        if (await specimen.count()) {
          const codeTab = specimen.getByRole('tab', {name: 'Code', exact: true}).first();
          if (await codeTab.count()) {
            await codeTab.click();
            await page.waitForFunction(element => element.getAttribute('aria-selected') === 'true', await codeTab.elementHandle());
            assert.ok(await specimen.locator('[role="tabpanel"]:visible code').count(), `${label}: source panel missing`);
            await specimen.getByRole('tab', {name: 'Preview', exact: true}).first().click();
          }
          if (['components/typography', 'components/expandable', 'components/latex', 'components/callouts'].includes(route)) {
            const file = `${scenario.name}-${route.split('/')[1]}.png`;
            await specimen.screenshot({path: join(output, file)});
            report.screenshots.push(file);
          }
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${label}: page overflows horizontally`);
        report.pages++;
        console.log(`PASS ${label}`);
      } catch (error) {
        report.errors.push(error.message);
        console.error(`FAIL ${error.message}`);
      }
    }
    await context.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server ? server.httpServer.close(resolve) : resolve());
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
if (report.errors.length) process.exitCode = 1;
