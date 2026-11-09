import { readFileSync, realpathSync } from 'node:fs';
import { extname, relative } from 'node:path';
import postcss, { type AtRule, type ChildNode, type Root } from 'postcss';
import valueParser, { type FunctionNode } from 'postcss-value-parser';
import { cssUrlValue, decodeCssEscapes, resolveCssReference, resolveStylesheets } from './styles.js';
import { validateEmbeddedStylesheets, type EmbeddedStylesheet } from './embedded-css.js';

const assetTypes: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.otf': 'font/otf',
};

/** Prepare app-owned CSS for the runtime's load.stylesheets payload, without network access. */
export function prepareEmbeddedStylesheets(styles: unknown, docsDir: string): EmbeddedStylesheet[] {
  const files = resolveStylesheets(styles, docsDir);
  const names = files.map(file => relative(realpathSync(docsDir), file).split('\\').join('/'));
  // Validate paths/counts before doing any expansion; empty contents are safe.
  validateEmbeddedStylesheets(names, names.map(path => ({ path, content: '' })));
  const cache = new Map<string, Root>();
  let imports = 0;
  let expandedBytes = 0;
  const expand = (file: string, ancestors: Set<string>): Root => {
    if (ancestors.has(file)) throw new Error('Embedded CSS must not contain circular imports');
    const cached = cache.get(file);
    if (cached) return cached.clone();
    const next = new Set(ancestors).add(file);
    const css = postcss.parse(readFileSync(file, 'utf8'), { from: file });
    css.walkAtRules(rule => {
      if (decodeCssEscapes(rule.name).toLowerCase() === 'charset') rule.remove();
    });
    css.walkAtRules(rule => {
      if (decodeCssEscapes(rule.name).toLowerCase() !== 'import') return;
      const tokens = valueParser(rule.params).nodes;
      const first = tokens.findIndex(node => node.type !== 'space' && node.type !== 'comment');
      const imported = resolveCssReference(cssUrlValue(tokens[first]), file, docsDir, true)!;
      if (++imports > 256) throw new Error('Embedded CSS exceeds 256 imports');
      const importedCss = expand(imported, next);
      expandedBytes += Buffer.byteLength(importedCss.toString());
      if (expandedBytes > 1_000_000) throw new Error('Embedded CSS expansion exceeds 1 MB');
      let nodes: ChildNode[] = importedCss.nodes;
      const qualifiers = tokens.slice(first + 1).filter(node => node.type !== 'space' && node.type !== 'comment');
      const layer = qualifiers[0];
      const hasLayer = layer && decodeCssEscapes(layer.value).toLowerCase() === 'layer';
      if (hasLayer) qualifiers.shift();
      const supports = qualifiers[0];
      const hasSupports = supports?.type === 'function' && decodeCssEscapes(supports.value).toLowerCase() === 'supports';
      if (hasSupports) qualifiers.shift();
      const wrap = (name: string, params: string) => {
        const wrapper = postcss.atRule({ name, params });
        wrapper.append(nodes);
        nodes = [wrapper];
      };
      if (qualifiers.length) {
        // Parser nodes preserve spaces when serialized as an unfiltered tail.
        const lastQualifier = hasSupports ? supports : hasLayer ? layer : undefined;
        const tail = lastQualifier ? tokens.slice(tokens.indexOf(lastQualifier) + 1) : tokens.slice(first + 1);
        const condition = valueParser.stringify(tail).trim();
        if (condition) wrap('media', condition);
      }
      if (hasSupports) {
        const condition = valueParser.stringify((supports as FunctionNode).nodes).trim();
        wrap('supports', condition.startsWith('(') || /^(?:selector|font-tech|font-format)\(/.test(condition) ? condition : `(${condition})`);
      }
      if (hasLayer) wrap('layer', layer.type === 'function' ? valueParser.stringify(layer.nodes) : '');
      rule.replaceWith(...nodes);
    });
    const inline = (value: string) => {
      const parsed = valueParser(value);
      parsed.walk(node => {
        if (node.type !== 'function' || decodeCssEscapes(node.value).toLowerCase() !== 'url') return;
        const reference = cssUrlValue(node);
        const asset = resolveCssReference(reference, file, docsDir);
        if (!asset) return false;
        const type = assetTypes[extname(asset).toLowerCase()];
        if (!type) throw new Error(`Unsupported embedded CSS asset: ${asset}`);
        node.value = 'url';
        node.nodes = [{ type: 'string', quote: '"', value: `data:${type};base64,${readFileSync(asset).toString('base64')}`, sourceIndex: 0, sourceEndIndex: 0 }];
        return false;
      });
      return parsed.toString();
    };
    // Imported nodes are already self-contained; only their data/fragment URLs remain.
    css.walkDecls(declaration => { declaration.value = inline(declaration.value); });
    css.walkAtRules((rule: AtRule) => { rule.params = inline(rule.params); });
    if (Buffer.byteLength(css.toString()) > 256_000) throw new Error('Embedded stylesheet exceeds 256 KB');
    cache.set(file, css.clone());
    return css;
  };
  const payload = files.map((file, index) => ({ path: names[index], content: expand(file, new Set()).toString() }));
  return validateEmbeddedStylesheets(names, payload);
}
