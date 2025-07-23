import { visit } from 'unist-util-visit';

export const remarkSafeVars = () => {
  return (tree: any) => {
    visit(tree, 'mdxTextExpression', (node: any, index: number | undefined, parent: any) => {
      if (parent && typeof index === 'number') {
        // Replace mdxTextExpression with inlineCode node for code formatting
        parent.children[index] = {
          type: 'inlineCode',
          value: node.value
        };
      }
    });
  };
};

const KNOWN_COMPONENTS = [
  // Text components
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'Row', 'Col', 'a', 'img',
  // Code components  
  'code', 'CodeGroup', 'pre',
  // UI components
  'Accordion', 'AccordionGroup', 'Icon', 'Card', 'CardGroup',
  'Callout', 'Note', 'Warning', 'Info', 'Tip', 'Check',
  'Latex', 'API', 'Expandable', 'ResponseField', 'Properties', 'Property',
  'Steps', 'Step', 'table', 'th', 'td', 'ul', 'ol', 'li',
  'APIPlayground', 'WebSocketPlayground', 'AsyncAPI', 'Source',
  // Common HTML elements that should be preserved
  'div', 'span', 'br', 'hr', 'strong', 'em', 'b', 'i', 'u', 's',
  'blockquote', 'nav', 'section', 'article', 'header', 'footer', 'main',
  'aside', 'figure', 'figcaption', 'details', 'summary', 'mark', 'small',
  'del', 'ins', 'sub', 'sup', 'kbd', 'samp', 'var', 'time', 'abbr',
  'address', 'cite', 'q', 'dfn'
];

export function preprocessMdxTags() {
  return {
    name: 'preprocess-mdx-tags',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('.mdx')) return;

      // Remove leading whitespace from code fence blocks
      let processed = code.replace(/^(\s+)(```\w*)/gm, '$2');

      // Replace unrecognized <someTag> with `"<someTag>"`
      processed = processed.replace(/<([a-z][a-z0-9]+)>/gi, (match, tag) => {
        const known = KNOWN_COMPONENTS.includes(tag);
        return known ? match : `\`<${tag}>\``; // wrap in backticks to keep as code
      });

      return {
        code: processed,
        map: null,
      };
    },
  };
}