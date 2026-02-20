/**
 * Post-build SSR rendering script.
 * Reads the SSR bundle from dist-ssr/, renders each route to HTML,
 * and injects the content into the prerendered HTML files in dist/.
 * Also inlines frontmatter JSON so the client can hydrate without fetching.
 */
import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '..', 'dist');
const ssrDir = resolve(__dirname, '..', 'dist-ssr');

// Check prerequisites
const frontmatterPath = resolve(distDir, 'frontmatter.json');
if (!existsSync(frontmatterPath)) {
  console.warn('⚠️  frontmatter.json not found, skipping SSR rendering');
  process.exit(0);
}

const ssrEntryPath = resolve(ssrDir, 'entry-server.js');
if (!existsSync(ssrEntryPath)) {
  console.warn('⚠️  SSR bundle not found, skipping SSR rendering');
  process.exit(0);
}

// Import SSR bundle
const { render } = await import(ssrEntryPath);
const frontmatter = JSON.parse(readFileSync(frontmatterPath, 'utf-8'));

let count = 0;
let failed = 0;

function injectSSR(htmlPath, ssrHtml, routePath) {
  let html = readFileSync(htmlPath, 'utf-8');

  // Inject SSR-rendered content into #app
  html = html.replace(
    '<div id="app"></div>',
    `<div id="app">${ssrHtml}</div>`
  );

  // Blocking theme script — sets dark class before first paint to prevent flash.
  // Inline frontmatter JSON so the client can read it synchronously.
  html = html.replace(
    '</head>',
    `<script>(function(){try{var t=localStorage.getItem("@clidey/dory/theme");if(t==="dark"||(t==="system"||!t)&&window.matchMedia("(prefers-color-scheme:dark)").matches)document.documentElement.classList.add("dark")}catch(e){}})();window.__DORY_FRONTMATTER__=${JSON.stringify(frontmatter)};window.__DORY_ROUTE__=${JSON.stringify(routePath)};</script>\n</head>`
  );

  html = html.replace(
    '<noscript>You need to enable JavaScript to run this app.</noscript>',
    '<noscript>JavaScript enhances this page with interactive features.</noscript>'
  );

  writeFileSync(htmlPath, html, 'utf-8');
}

// Render each route — pass frontmatter so SSR can build navigation titles
for (const page of frontmatter) {
  const routePath = page.path;
  if (!routePath || routePath === '/') continue;

  const htmlPath = resolve(distDir, routePath.replace(/^\//, ''), 'index.html');
  if (!existsSync(htmlPath)) continue;

  try {
    const ssrHtml = await render(routePath, frontmatter);
    if (!ssrHtml) continue;

    injectSSR(htmlPath, ssrHtml, routePath);
    count++;
  } catch (error) {
    console.warn(`⚠️  SSR failed for ${routePath}: ${error.message}`);
    failed++;
  }
}

// Also render the root index.html with the first page's content
try {
  const rootHtmlPath = resolve(distDir, 'index.html');
  if (existsSync(rootHtmlPath) && frontmatter.length > 0) {
    const firstRoute = frontmatter[0].path;
    if (firstRoute) {
      const ssrHtml = await render(firstRoute, frontmatter);
      if (ssrHtml) {
        injectSSR(rootHtmlPath, ssrHtml, firstRoute);
        count++;
      }
    }
  }
} catch (error) {
  console.warn(`⚠️  SSR failed for root: ${error.message}`);
}

// Cleanup SSR build artifacts
try {
  rmSync(ssrDir, { recursive: true, force: true });
} catch {
  // Non-fatal: dist-ssr will be overwritten on next build
}

console.log(`✅ SSR rendered ${count} routes${failed > 0 ? ` (${failed} failed)` : ''}`);
