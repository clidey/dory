import { visit } from 'unist-util-visit';

// This plugin replaces mdxTextExpression nodes with inlineCode for safety.
export const remarkSafeVars = () => {
  return (tree: any) => {
    visit(tree, 'mdxTextExpression', (node: any, index: number | undefined, parent: any) => {
      if (parent && typeof index === 'number') {
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

// Helper: returns true if the given code string is inside a code block (```)
function isInsideCodeBlock(code: string, idx: number): boolean {
  // Count the number of ``` before idx
  const before = code.slice(0, idx);
  const codeBlockMatches = before.match(/```/g);
  // Odd number of ``` means inside a code block
  return codeBlockMatches ? codeBlockMatches.length % 2 === 1 : false;
}

// Allow <service> and any <[a-z][a-z0-9]*> tag inside code blocks to be left as-is (not parsed as JSX).
export function preprocessMdxTags() {
  return {
    name: 'preprocess-mdx-tags',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('.mdx')) return;

      // Remove leading whitespace from code fence blocks
      let processed = code.replace(/^(\s+)(```\w*)/gm, '$2');

      // Only replace unrecognized <someTag> with `"<someTag>"` if NOT inside a code block
      // This regex finds all <tag> occurrences
      processed = processed.replace(/<([a-z][a-z0-9]*)>/gi, (match, tag, offset) => {
        // If inside a code block, do not touch
        if (isInsideCodeBlock(processed, offset)) {
          return match;
        }
        // If known component, leave as-is
        if (KNOWN_COMPONENTS.includes(tag)) {
          return match;
        }
        // If tag is 'service', always leave as-is (do not wrap in backticks)
        if (tag === 'service') {
          return match;
        }
        // Otherwise, wrap in backticks to prevent JSX parsing
        return `\`<${tag}>\``;
      });

      return {
        code: processed,
        map: null,
      };
    },
  };
}