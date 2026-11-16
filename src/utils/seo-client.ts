import { isManagedMeta, type PageMetadata } from './seo';

/** Replace managed metadata together so images, robots and schema cannot leak between routes. */
export function applyPageMetadata(metadata: PageMetadata): void {
  document.title = metadata.title;
  document.documentElement.lang = metadata.lang;
  document.head.querySelectorAll('meta').forEach(element => {
    const key = element.getAttribute('name') || element.getAttribute('property') || '';
    if (isManagedMeta(key)) element.remove();
  });
  for (const [key, content] of Object.entries(metadata.meta)) {
    const element = document.createElement('meta');
    element.setAttribute(key.startsWith('og:') || key.startsWith('article:') ? 'property' : 'name', key);
    element.content = content;
    document.head.appendChild(element);
  }
  document.head.querySelectorAll('link[rel="canonical"], link[hreflang], script[data-dory-seo], script[data-dory-site-schema]').forEach(element => element.remove());
  if (metadata.canonical) {
    const link = document.createElement('link'); link.rel = 'canonical'; link.href = metadata.canonical;
    document.head.appendChild(link);
  }
  for (const alternate of metadata.alternates) {
    const link = document.createElement('link'); link.rel = 'alternate'; link.hreflang = alternate.lang; link.href = alternate.href;
    document.head.appendChild(link);
  }
  const script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.dorySeo = '';
  script.textContent = JSON.stringify(metadata.schema).replace(/</g, '\\u003c');
  document.head.appendChild(script);
}

