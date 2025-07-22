import { visit } from 'unist-util-visit';

export function preprocessMdxTags() {
  return {
    name: 'preprocess-mdx-tags',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('.mdx')) return;

      // Replace unrecognized <someTag> with `"<someTag>"`
      const processed = code.replace(/<([a-z][a-z0-9]+)>/gi, (match, tag) => {
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

// List of known MDX components that should NOT be converted to code
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

function serializeJsxElement(node: any): string {
  // Handle self-closing tags with no children
  if (!node.children || node.children.length === 0) {
    const attrs = serializeAttributes(node.attributes);
    return `<${node.name}${attrs ? ' ' + attrs : ''} />`;
  }
  
  // Handle tags with children
  const attrs = serializeAttributes(node.attributes);
  const childrenText = node.children
    .map((child: any) => {
      if (child.type === 'text') return child.value;
      if (child.type === 'mdxJsxTextElement' || child.type === 'mdxJsxFlowElement') {
        return serializeJsxElement(child);
      }
      return child.value || '';
    })
    .join('');
    
  return `<${node.name}${attrs ? ' ' + attrs : ''}>${childrenText}</${node.name}>`;
}

function serializeAttributes(attributes: any[]): string {
  if (!attributes || attributes.length === 0) return '';
  
  return attributes
    .map((attr: any) => {
      if (attr.type === 'mdxJsxAttribute') {
        if (attr.value === null || attr.value === undefined) {
          return attr.name; // boolean attribute
        }
        if (typeof attr.value === 'string') {
          return `${attr.name}="${attr.value}"`;
        }
        return `${attr.name}={${attr.value}}`;
      }
      if (attr.type === 'mdxJsxExpressionAttribute') {
        return `{...${attr.value}}`;
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

export const remarkSafeVars = () => {
  return (tree: any) => {
    // Handle text expressions (like {variable})
    visit(tree, 'mdxTextExpression', (node: any, index: number | undefined, parent: any) => {
      if (parent && typeof index === 'number') {
        // Check if this looks like it should be an HTML tag (variable name pattern, could be a placeholder)
        const trimmedValue = node.value.trim();
        const isLikelyHtmlTag = typeof node.value === 'string' && 
                               /^[a-zA-Z][a-zA-Z0-9_]*$/.test(trimmedValue) &&
                               !KNOWN_COMPONENTS.includes(trimmedValue) &&
                               // Don't convert common JavaScript keywords/variables that aren't likely to be tags
                               !['undefined', 'null', 'true', 'false', 'this', 'window', 'document'].includes(trimmedValue.toLowerCase());
        
        let value = node.value;
        if (isLikelyHtmlTag) {
          value = `<${node.value.trim()}>`;
        }
        
        // Replace mdxTextExpression with inlineCode node for code formatting
        parent.children[index] = {
          type: 'inlineCode',
          value: value
        };
      }
    });

    // Handle unknown JSX elements in text context (inline)
    visit(tree, 'mdxJsxTextElement', (node: any, index: number | undefined, parent: any) => {
      if (parent && typeof index === 'number' && node.name && !KNOWN_COMPONENTS.includes(node.name)) {
        // Convert unknown JSX elements to inline code
        parent.children[index] = {
          type: 'inlineCode',
          value: serializeJsxElement(node)
        };
      }
    });

    // Handle unknown JSX elements in flow context (block)
    visit(tree, 'mdxJsxFlowElement', (node: any, index: number | undefined, parent: any) => {
      if (parent && typeof index === 'number' && node.name && !KNOWN_COMPONENTS.includes(node.name)) {
        // Convert unknown JSX elements to inline code (for simple cases) or code block
        const serialized = serializeJsxElement(node);
        
        // If it's a simple single-line element, use inlineCode
        if (!serialized.includes('\n') && serialized.length < 100) {
          parent.children[index] = {
            type: 'inlineCode', 
            value: serialized
          };
        } else {
          // For complex elements, use a code block
          parent.children[index] = {
            type: 'code',
            lang: null,
            meta: null,
            value: serialized
          };
        }
      }
    });
  };
};
