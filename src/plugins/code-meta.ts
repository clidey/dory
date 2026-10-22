import { visit } from 'unist-util-visit';

interface CodeElement {
  tagName?: string;
  data?: { meta?: string };
  properties?: Record<string, unknown>;
}

/**
 * Rehype plugin that keeps a code fence's meta string (everything after the
 * language, e.g. ```json dory.json {4-6}). MDX drops it by default; this
 * exposes it to the `code` component as the `metastring` prop.
 */
export function rehypeCodeMeta() {
  return (tree: Parameters<typeof visit>[0]) => {
    visit(tree, 'element', (node: CodeElement) => {
      const meta = node.data?.meta;
      if (node.tagName === 'code' && meta) {
        node.properties = { ...node.properties, metastring: meta };
      }
    });
  };
}
