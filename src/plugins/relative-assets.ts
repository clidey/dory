import { existsSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';
import { visit } from 'unist-util-visit';

interface ImageNode {
  type: 'image';
  url: string;
}

interface JsxElementNode {
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
  name: string | null;
  attributes: Array<{ type: string; name?: string; value?: unknown }>;
}

// Absolute paths, protocol URLs (https:, data:, mailto:), protocol-relative URLs and anchors stay as written.
const notRelative = /^(?:[a-z][a-z\d+.-]*:|\/|#)/i;

/**
 * Resolves a relative asset URL written in `mdxFile` to a root path on the
 * built site (docs/ maps to /). Returns null for URLs that are not relative
 * or that point outside the docs directory.
 */
export function resolveAssetUrl(url: string, mdxFile: string, docsDir: string): string | null {
  if (!url || notRelative.test(url)) return null;

  const suffixIndex = url.search(/[?#]/);
  const pathPart = suffixIndex === -1 ? url : url.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? '' : url.slice(suffixIndex);

  const target = resolve(dirname(mdxFile), pathPart);
  const fromDocs = relative(docsDir, target);
  if (fromDocs.startsWith('..') || fromDocs === '') return null;

  return `/${fromDocs.split(sep).join('/')}${suffix}`;
}

/**
 * Remark plugin that rewrites relative image paths to root paths, resolved
 * against the MDX file's own directory. Pages are served as directories
 * (/features/ after a trailing-slash redirect), so a relative path left in
 * the HTML would resolve against the page URL instead of the file.
 * Covers Markdown images and <img src="..."> in MDX, and warns when the
 * target file does not exist.
 */
export function remarkRelativeAssets(options: { docsDir?: string } = {}) {
  const docsDir = options.docsDir ?? resolve(process.cwd(), 'docs');

  return (tree: Parameters<typeof visit>[0], file: { path?: string }) => {
    const mdxFile = file.path;
    if (!mdxFile) return;

    const rewrite = (url: string): string | null => {
      const resolved = resolveAssetUrl(url, mdxFile, docsDir);
      if (resolved === null) return null;
      const onDisk = resolve(docsDir, decodeURI(resolved.replace(/[?#].*$/, '')).slice(1));
      if (!existsSync(onDisk)) {
        console.warn(`⚠️  ${relative(docsDir, mdxFile)}: image "${url}" not found at ${relative(process.cwd(), onDisk)}`);
      }
      return resolved;
    };

    visit(tree, (node) => {
      if (node.type === 'image') {
        const image = node as unknown as ImageNode;
        image.url = rewrite(image.url) ?? image.url;
        return;
      }

      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        const element = node as unknown as JsxElementNode;
        if (element.name !== 'img') return;
        const src = element.attributes.find((attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'src');
        if (src && typeof src.value === 'string') {
          src.value = rewrite(src.value) ?? src.value;
        }
      }
    });
  };
}
