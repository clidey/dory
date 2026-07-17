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
  console.error('❌ frontmatter.json not found — SSR rendering cannot proceed');
  process.exit(1);
}

const ssrEntryPath = resolve(ssrDir, 'entry-server.js');
if (!existsSync(ssrEntryPath)) {
  console.error('❌ SSR bundle not found — SSR rendering cannot proceed');
  process.exit(1);
}

// Import SSR bundle
const { render } = await import(ssrEntryPath);
const frontmatter = JSON.parse(readFileSync(frontmatterPath, 'utf-8'));

let count = 0;
let failed = 0;

// Returns true on success, false if a required injection marker is missing.
function injectSSR(htmlPath, ssrHtml, routePath) {
  let html = readFileSync(htmlPath, 'utf-8');

  const appMarker = '<div id="app"></div>';
  if (!html.includes(appMarker)) {
    console.warn(`⚠️  SSR injection failed for ${routePath}: missing ${appMarker} marker`);
    return false;
  }
  if (!html.includes('</head>')) {
    console.warn(`⚠️  SSR injection failed for ${routePath}: missing </head> marker`);
    return false;
  }

  // Inject SSR-rendered content into #app
  html = html.replace(appMarker, `<div id="app">${ssrHtml}</div>`);

  // Escape "<" in inlined JSON so a "</script>" inside content can't
  // terminate the script tag (same as JSON-LD handling in prerender.ts).
  const frontmatterJson = JSON.stringify(frontmatter).replace(/</g, '\\u003c');
  const routeJson = JSON.stringify(routePath).replace(/</g, '\\u003c');

  // Blocking theme script — sets dark class before first paint to prevent flash.
  // Inline frontmatter JSON so the client can read it synchronously.
  html = html.replace(
    '</head>',
    `<script>(function(){try{var t=localStorage.getItem("@clidey/dory/theme");if(t==="dark"||(t==="system"||!t)&&window.matchMedia("(prefers-color-scheme:dark)").matches)document.documentElement.classList.add("dark")}catch(e){}})();window.__DORY_FRONTMATTER__=${frontmatterJson};window.__DORY_ROUTE__=${routeJson};</script>\n</head>`
  );

  // Optional: nicer noscript message; fine if the marker is absent.
  html = html.replace(
    '<noscript>You need to enable JavaScript to run this app.</noscript>',
    '<noscript>JavaScript enhances this page with interactive features.</noscript>'
  );

  writeFileSync(htmlPath, html, 'utf-8');
  return true;
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

    if (injectSSR(htmlPath, ssrHtml, routePath)) {
      count++;
    } else {
      failed++;
    }
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
        if (injectSSR(rootHtmlPath, ssrHtml, firstRoute)) {
          count++;
        } else {
          failed++;
        }
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

if (failed > 0) {
  console.error(`❌ SSR rendering failed for ${failed} route(s) (${count} succeeded)`);
  process.exit(1);
}

if (count === 0 && frontmatter.length > 0) {
  console.error('❌ SSR rendered 0 routes but frontmatter.json lists routes');
  process.exit(1);
}

console.log(`✅ SSR rendered ${count} routes`);
