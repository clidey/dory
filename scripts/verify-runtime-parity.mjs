import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const docsRoot = join(root, 'docs');
const pagePath = 'getting-started/whodb-ee-apps';

function docsFiles(directory = docsRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) return docsFiles(file);
    return entry.name.endsWith('.mdx')
      ? [{ path: `docs/${relative(docsRoot, file).replaceAll('\\', '/')}`, content: readFileSync(file, 'utf8') }]
      : [];
  });
}

const config = JSON.parse(readFileSync(join(docsRoot, 'dory.json'), 'utf8'));
const logo = readFileSync(join(docsRoot, 'logo/logo.svg')).toString('base64');
config.logo = {
  light: `data:image/svg+xml;base64,${logo}`,
  dark: `data:image/svg+xml;base64,${logo}`,
};

function visualMetrics() {
  const measure = selector => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) ?? '',
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      font: style.fontFamily, fontSize: style.fontSize, lineHeight: style.lineHeight,
      weight: style.fontWeight, color: style.color, background: style.backgroundColor,
      padding: style.padding,
    };
  };
  const article = measure('.dory-article');
  const headings = [...document.querySelectorAll('.dory-article h1')].map(element => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return { text: element.textContent?.trim().replace(/\s+/g, ' ') ?? '', y: rect.y, fontSize: style.fontSize, lineHeight: style.lineHeight };
  });
  return {
    html: measure('html'), header: measure('.dory-topbar'), main: measure('.dory-main'), article,
    breadcrumb: measure('.dory-breadcrumb'), activeNav: measure('.dory-sidebar-link.active'),
    topNav: measure('header nav[aria-label]'), firstTab: measure('.dory-topbar-tab'),
    headerSearch: measure('.dory-topbar-search'), sidebarSearch: measure('#dory-embedded-search'),
    pageActions: measure('.dory-page-actions'), firstSection: measure('.dory-article h2'),
    firstParagraph: measure('.dory-article p'), toc: measure('.dory-toc-list'), headings,
    topTabs: [...document.querySelectorAll('.dory-topbar-tab')].map(element => element.textContent?.trim()),
  };
}

const differences = [];
function equal(label, expected, actual) {
  if (expected !== actual) differences.push(`${label}: full site ${JSON.stringify(expected)}, embed ${JSON.stringify(actual)}`);
}
function near(label, expected, actual, tolerance = 3) {
  if (typeof expected !== 'number' || typeof actual !== 'number' || Math.abs(expected - actual) > tolerance)
    differences.push(`${label}: full site ${Math.round(expected ?? NaN)}px, embed ${Math.round(actual ?? NaN)}px`);
}
function compare(full, embed, theme) {
  for (const key of ['html', 'header', 'main', 'article', 'firstSection', 'firstParagraph']) {
    for (const field of ['background', 'color', 'font', 'fontSize', 'lineHeight']) {
      equal(`${theme} ${key}.${field}`, full[key]?.[field], embed[key]?.[field]);
    }
  }
  for (const key of ['header', 'main', 'article', 'breadcrumb', 'activeNav', 'topNav', 'firstTab', 'firstSection', 'firstParagraph']) {
    for (const field of ['x', 'width']) near(`${theme} ${key}.${field}`, full[key]?.[field], embed[key]?.[field]);
  }
  equal(`${theme} first tab color`, full.firstTab?.color, embed.firstTab?.color);
  equal(`${theme} breadcrumb`, full.breadcrumb?.text, embed.breadcrumb?.text);
  equal(`${theme} top tabs`, full.topTabs.join('|'), embed.topTabs.join('|'));
  equal(`${theme} page actions present`, Boolean(full.pageActions), Boolean(embed.pageActions));
  equal(`${theme} topbar search present`, Boolean(full.headerSearch), Boolean(embed.headerSearch));
  equal(`${theme} sidebar search present`, Boolean(full.sidebarSearch), Boolean(embed.sidebarSearch));
  equal(`${theme} hero count`, full.headings.length, embed.headings.length);
  for (let index = 0; index < full.headings.length; index++) {
    equal(`${theme} hero ${index + 1} text`, full.headings[index]?.text, embed.headings[index]?.text);
    equal(`${theme} hero ${index + 1} font size`, full.headings[index]?.fontSize, embed.headings[index]?.fontSize);
    near(`${theme} hero ${index + 1} offset`, full.headings[index]?.y - full.article.y, embed.headings[index]?.y - embed.article.y);
  }
  for (const key of ['firstSection', 'firstParagraph', 'activeNav'])
    near(`${theme} ${key} vertical offset`, full[key]?.y - full.article.y, embed[key]?.y - embed.article.y);
}

const server = process.env.DORY_PARITY_ORIGIN ? null : await preview({
  root,
  preview: { host: '127.0.0.1', port: 0 },
});
const port = server?.httpServer.address()?.port;
const origin = process.env.DORY_PARITY_ORIGIN ?? `http://127.0.0.1:${port}`;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const theme of ['light', 'dark']) {
    const full = await browser.newPage({ viewport: { width: 2048, height: 1200 } });
    await full.goto(`${origin}/${pagePath}`, { waitUntil: 'networkidle' });
    if (theme === 'dark') await full.locator('html').evaluate(element => { element.classList.remove('light'); element.classList.add('dark'); });
    await full.evaluate(() => document.fonts.ready);
    const fullMetrics = await full.evaluate(visualMetrics);

    const embed = await browser.newPage({ viewport: { width: 2048, height: 1200 } });
    await embed.goto(`${origin}/runtime/dory-runtime.html`, { waitUntil: 'networkidle' });
    await embed.evaluate(({ files, config, theme, pagePath }) => {
      window.postMessage({ __dory_docs: true, type: 'load', files, path: `docs/${pagePath}.mdx`, theme, locale: 'en_US', config }, '*');
    }, { files: docsFiles(), config, theme, pagePath });
    await embed.getByRole('heading', { name: 'Document WhoDB EE apps' }).waitFor();
    await embed.evaluate(() => document.fonts.ready);
    const embedMetrics = await embed.evaluate(visualMetrics);
    compare(fullMetrics, embedMetrics, theme);
    if (differences.length || process.env.DORY_PARITY_SCREENSHOTS === '1') {
      await full.screenshot({ path: `/tmp/dory-parity-full-${theme}.png` });
      await embed.screenshot({ path: `/tmp/dory-parity-embed-${theme}.png` });
    }
    await embed.evaluate(({ files, config, theme }) => {
      window.postMessage({ __dory_docs: true, type: 'load', files, path: 'docs/components/accordion.mdx', theme, locale: 'en_US', config }, '*');
    }, { files: docsFiles(), config, theme });
    await embed.getByRole('heading', { name: 'Accordion', exact: true }).first().waitFor();
    const specimen = embed.locator('.dory-specimen').first();
    await specimen.getByRole('tab', { name: 'Code' }).click();
    await specimen.locator('pre').first().waitFor();
    await specimen.getByRole('tab', { name: 'Preview' }).click();
    await embed.evaluate(({ files, config, theme }) => {
      window.postMessage({ __dory_docs: true, type: 'load', files, path: 'docs/components/icons.mdx', theme, locale: 'en_US', config }, '*');
    }, { files: docsFiles(), config, theme });
    await embed.locator('button[title^="Copy <Icon"]').first().waitFor();
    await full.close();
    await embed.close();
  }
  if (differences.length) {
    console.error(`Dory embedded runtime differs from the full docs site:\n${differences.map(item => `- ${item}`).join('\n')}`);
    console.error('Screenshots: /tmp/dory-parity-{full,embed}-{light,dark}.png');
    process.exitCode = 1;
  } else {
    console.log('Dory full site and embedded runtime visual parity passed in light and dark mode.');
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server?.httpServer.close(resolve) ?? resolve());
}
