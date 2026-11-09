import type { EmbeddedStylesheet } from '../../bin/embedded-css';
export { embeddedStyleLimits, normalizeEmbeddedStylePath, validateEmbeddedCss, validateEmbeddedStylesheets } from '../../bin/embedded-css';
export type { EmbeddedStylesheet } from '../../bin/embedded-css';

export function applyEmbeddedStylesheets(stylesheets: EmbeddedStylesheet[], target: Document = document): void {
  for (const element of target.querySelectorAll('style[data-dory-custom-style]')) element.remove();
  for (const sheet of stylesheets) {
    const element = target.createElement('style');
    element.dataset.doryCustomStyle = sheet.path;
    element.textContent = sheet.content;
    target.head.appendChild(element);
  }
}
