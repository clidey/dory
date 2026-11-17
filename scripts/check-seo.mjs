import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Audit the actual static output, including deployments below a base path. */
export function checkSeo(outDir, config) {
  const failures = [], warnings = [];
  const check = (ok, route, message) => { if (!ok) failures.push(`${route}: ${message}`); };
  const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const origin = (config.url || '').replace(/\/+$/, '');
  const base = `/${(config.basePath || '').replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '');
  const site = origin ? `${origin}${base}` : '';
  const pages = JSON.parse(readFileSync(resolve(outDir, 'frontmatter.json'), 'utf8'));
  const indexable = new Set(), titles = new Map(), descriptions = new Map();
  for (const page of [...pages, ...(pages.some(entry => entry.path === '/') ? [] : [{ path: '/', alias: true }]), { path: '/404', error: true }]) {
    const file = resolve(outDir, page.error ? '404.html' : page.path === '/' ? 'index.html' : `${page.path.slice(1)}/index.html`);
    check(existsSync(file), page.path, 'missing prerendered HTML');
    if (!existsSync(file)) continue;
    const html = readFileSync(file, 'utf8'), head = html.split('</head>')[0];
    const meta = [...head.matchAll(/<meta\b[^>]*>/g)].map(match => Object.fromEntries([...match[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map(m => [m[1], decode(m[2])])));
    const one = key => {
      const matches = meta.filter(entry => (entry.name || entry.property) === key);
      check(matches.length === 1 && Boolean(matches[0]?.content), page.path, `expected one nonempty ${key}`);
      return matches[0]?.content || '';
    };
    const titleTags = [...head.matchAll(/<title>([\s\S]*?)<\/title>/g)], title = decode(titleTags[0]?.[1] || '');
    check(titleTags.length === 1 && Boolean(title), page.path, 'expected one nonempty title');
    const description = one('description'), robots = one('robots');
    const noindex = /\b(noindex|none)\b/i.test(robots);
    for (const key of ['og:title', 'og:description', 'og:site_name', 'og:type', 'og:locale', 'twitter:title', 'twitter:description', 'twitter:card']) one(key);
    check(one('og:title') === title && one('twitter:title') === title, page.path, 'social titles differ from document title');
    check(one('og:description') === description && one('twitter:description') === description, page.path, 'social descriptions differ');
    const canonicalTags = [...head.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g)];
    const canonical = decode(canonicalTags[0]?.[1] || '');
    if (site && !page.error) {
      check(canonicalTags.length === 1, page.path, 'expected one canonical');
      check(canonical === one('og:url'), page.path, 'og:url differs from canonical');
      const expected = `${site}${page.alias ? (pages.find(entry => entry.path === '/') || pages[0])?.path || '/' : page.path}`;
      check(canonical === expected, page.path, `canonical differs from ${expected}`);
    } else check(canonicalTags.length === 0, page.path, 'unexpected canonical');
    if (!page.error) {
      const body = html.split('</head>')[1] || '';
      check(/<h1\b/.test(body), page.path, 'missing static h1');
      check(!/<div id="app"><\/div>/.test(body), page.path, 'empty static app');
    }
    const image = meta.find(entry => entry.property === 'og:image')?.content;
    if (config.seo?.generateSocialImages !== false || config.seo?.ogImage || config.image || page.image || page.ogImage) {
      check(Boolean(image), page.path, 'missing social preview image');
    }
    if (image) {
      if (image.startsWith('https://')) check(one('og:image:secure_url') === image, page.path, 'secure social image URL differs');
      check(image === one('twitter:image'), page.path, 'social image URLs differ');
      one('og:image:alt'); one('twitter:image:alt');
      if (site) check(/^https?:\/\//.test(image), page.path, 'social image is not absolute');
      const localImage = site && image.startsWith(`${site}/`) ? image.slice(site.length) : !origin && image.startsWith(`${base}/`) ? image.slice(base.length) : '';
      if (localImage) {
        const imageFile = resolve(outDir, localImage.replace(/^\//, ''));
        check(existsSync(imageFile), page.path, 'missing social image asset');
        if (localImage.startsWith('/_dory/social/') && existsSync(imageFile)) {
          const bytes = readFileSync(imageFile);
          check(bytes.length > 24 && bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 630, page.path, 'invalid generated image dimensions');
          check(one('og:image:width') === '1200' && one('og:image:height') === '630' && one('og:image:type') === 'image/png', page.path, 'invalid image metadata');
        }
      }
    }
    const schemas = [...head.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
    check(schemas.length > 0, page.path, 'missing structured data');
    const nodes = [];
    for (const schema of schemas) {
      try { const json = JSON.parse(schema[1]); nodes.push(...(json['@graph'] || [json])); }
      catch { check(false, page.path, 'invalid JSON-LD'); }
    }
    if (site && !page.error) check(nodes.some(node => node['@type'] === 'WebPage' && node.url === canonical), page.path, 'missing canonical WebPage schema');
    if (page.error) check(noindex, page.path, '404 must be noindex');
    if (!noindex && !page.alias && !page.error) {
      if (canonical) indexable.add(canonical);
      for (const [value, map, label] of [[title, titles, 'title'], [description, descriptions, 'description']]) {
        if (map.has(value)) warnings.push(`${page.path}: duplicate ${label} (${map.get(value)})`);
        map.set(value, page.path);
      }
    }
  }
  const sitemapFile = resolve(outDir, 'sitemap.xml');
  if (site && !config.seo?.noindex) {
    check(existsSync(sitemapFile), 'sitemap', 'missing sitemap.xml');
    if (existsSync(sitemapFile)) {
      const urls = [...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(match => decode(match[1]));
      check(urls.length === new Set(urls).size, 'sitemap', 'duplicate URLs');
      for (const url of indexable) check(urls.includes(url), 'sitemap', `missing ${url}`);
      for (const url of urls) check(indexable.has(url), 'sitemap', `noncanonical or noindex URL ${url}`);
    }
    const robots = readFileSync(resolve(outDir, 'robots.txt'), 'utf8');
    check(robots.includes(`Sitemap: ${site}/sitemap.xml`), 'robots', 'missing sitemap directive');
  }
  if (warnings.length) console.warn(`SEO content suggestions:\n${warnings.join('\n')}`);
  if (failures.length) throw new Error(`SEO audit failed:\n${failures.join('\n')}`);
  console.log(`✅ SEO audit passed: ${pages.length} pages, static content, canonical/social/schema metadata and sitemap parity`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  checkSeo(resolve(process.argv[2] || resolve(root, 'dist')), JSON.parse(readFileSync(resolve(process.argv[3] || resolve(root, 'docs/dory.json')), 'utf8')));
}
