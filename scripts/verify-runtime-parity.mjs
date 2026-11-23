import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const docsRoot = join(root, 'docs');
const pagePath = 'getting-started/automation';

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
const basePath = String(config.basePath || '').replace(/\/$/, '');
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
async function verifyTabNavigation(full, embed, theme) {
  const pageName = entry => typeof entry === 'string' ? entry : entry.page;
  const sidebarLinks = page => page.locator('.dory-sidebar:visible .dory-sidebar-link');
  const checkSidebar = async (tab, route) => {
    const routes = tab.groups.flatMap(group => group.pages.map(pageName));
    const expected = routes.map(path => `${basePath}/${path}`);
    const titles = routes.map(path => readFileSync(join(docsRoot, `${path}.mdx`), 'utf8').match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1]);
    await full.waitForURL(`**${basePath}/${route}`);
    await full.locator('.dory-sidebar:visible [aria-current="page"]').waitFor();
    await embed.locator('.dory-sidebar:visible [aria-current="page"]').filter({ hasText: titles[routes.indexOf(route)] }).waitFor();
    equal(`${theme} ${tab.tab} sidebar routes`, expected.join('|'), (await sidebarLinks(full).evaluateAll(links => links.map(link => link.getAttribute('href')))).join('|'));
    equal(`${theme} ${tab.tab} embedded sidebar`, titles.join('|'), (await sidebarLinks(embed).locator('.truncate').allTextContents()).join('|'));
    equal(`${theme} ${tab.tab} active header`, await full.locator('.dory-topbar-tab.active').textContent(), await embed.locator('.dory-topbar-tab.active').textContent());
  };
  for (const tab of config.navigation.tabs) {
    const route = pageName(tab.groups.flatMap(group => group.pages)[0]);
    console.log(`Checking ${theme} desktop navigation: ${tab.tab}`);
    await full.locator('.dory-topbar-tab').filter({ hasText: tab.tab }).click();
    await embed.locator('.dory-topbar-tab').filter({ hasText: tab.tab }).click();
    await checkSidebar(tab, route);
    // Loading a nested page directly must select its owning tab too.
    const nested = pageName(tab.groups.flatMap(group => group.pages).at(-1));
    await full.goto(`${origin}${basePath}/${nested}`, { waitUntil: 'networkidle' });
    const index = tab.groups.flatMap(group => group.pages).length - 1;
    await sidebarLinks(embed).nth(index).click();
    await checkSidebar(tab, nested);
  }
  await full.setViewportSize({ width: 390, height: 844 });
  await embed.setViewportSize({ width: 390, height: 844 });
  for (const tab of config.navigation.tabs) {
    const route = pageName(tab.groups.flatMap(group => group.pages)[0]);
    console.log(`Checking ${theme} mobile navigation: ${tab.tab}`);
    await full.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
    await embed.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
    await full.getByRole('combobox', { name: 'Documentation section' }).selectOption({ label: tab.tab });
    await embed.getByRole('combobox', { name: 'Documentation section' }).selectOption({ label: tab.tab });
    await full.getByRole('combobox', { name: 'Documentation section' }).waitFor({ state: 'hidden' });
    await embed.getByRole('combobox', { name: 'Documentation section' }).waitFor({ state: 'hidden' });
    await full.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
    await embed.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
    await checkSidebar(tab, route);
    await full.getByRole('button', { name: 'Close', exact: true }).click();
    await embed.getByRole('button', { name: 'Close', exact: true }).click();
    await full.getByRole('combobox', { name: 'Documentation section' }).waitFor({ state: 'hidden' });
    await embed.getByRole('combobox', { name: 'Documentation section' }).waitFor({ state: 'hidden' });
  }
  await full.setViewportSize({ width: 2048, height: 1200 });
  await embed.setViewportSize({ width: 2048, height: 1200 });
}
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
    await full.addInitScript(theme => localStorage.setItem('@clidey/dory/theme', theme), theme);
    await full.goto(`${origin}${basePath}/${pagePath}`, { waitUntil: 'networkidle' });
    if (theme === 'dark') await full.locator('html').evaluate(element => { element.classList.remove('light'); element.classList.add('dark'); });
    await full.evaluate(() => document.fonts.ready);
    const fullMetrics = await full.evaluate(visualMetrics);

    const embed = await browser.newPage({ viewport: { width: 2048, height: 1200 } });
    await embed.goto(`${origin}${basePath}/runtime/dory-runtime.html`, { waitUntil: 'networkidle' });
    await embed.evaluate(({ files, config, theme, pagePath }) => {
      window.postMessage({ __dory_docs: true, type: 'load', files, path: `docs/${pagePath}.mdx`, theme, locale: 'en_US', config }, '*');
    }, { files: docsFiles(), config, theme, pagePath });
    await embed.getByRole('heading', { name: 'CLI and MCP automation' }).waitFor();
    await embed.evaluate(() => document.fonts.ready);
    const embedMetrics = await embed.evaluate(visualMetrics);
    compare(fullMetrics, embedMetrics, theme);
    if (differences.length || process.env.DORY_PARITY_SCREENSHOTS === '1') {
      await full.screenshot({ path: `/tmp/dory-parity-full-${theme}.png` });
      await embed.screenshot({ path: `/tmp/dory-parity-embed-${theme}.png` });
    }
    try {
      await verifyTabNavigation(full, embed, theme);
    } catch (error) {
      await full.screenshot({ path: `/tmp/dory-parity-full-${theme}.png` });
      await embed.screenshot({ path: `/tmp/dory-parity-embed-${theme}.png` });
      throw error;
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
