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

// Helper: checks if a known component tag has a matching closing tag
function hasMatchingClosingTag(code: string, tagName: string, openingTagOffset: number): boolean {
  // Simple approach: look for the next occurrence of either an opening or closing tag of the same type
  const afterOpening = code.slice(openingTagOffset + `<${tagName}>`.length);
  
  // Find the first occurrence of either opening or closing tag
  const nextOpeningMatch = afterOpening.match(new RegExp(`<${tagName}>`, 'i'));
  const nextClosingMatch = afterOpening.match(new RegExp(`</${tagName}>`, 'i'));
  
  // If no closing tag found at all
  if (!nextClosingMatch) {
    return false;
  }
  
  const nextOpeningIndex = nextOpeningMatch ? nextOpeningMatch.index! : Infinity;
  const nextClosingIndex = nextClosingMatch ? nextClosingMatch.index! : Infinity;
  
  // If the closing tag comes before any other opening tag, this tag is properly closed
  if (nextClosingIndex < nextOpeningIndex) {
    // Check if the closing tag is inside a code block
    const closingTagOffset = openingTagOffset + `<${tagName}>`.length + nextClosingIndex;
    if (isInsideCodeBlock(code, closingTagOffset)) {
      return false;
    }
    return true;
  }
  
  return false; // Another opening tag comes before the closing tag, so this one is not properly closed
}

// Allow any <[a-z][a-z0-9]*> tag inside code blocks to be left as-is (not parsed as JSX).
export function preprocessMdxTags() {
  return {
    name: 'preprocess-mdx-tags',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('.mdx')) return;

      // Remove leading whitespace from code fence blocks
      let processed = code.replace(/^(\s+)(```\w*)/gm, '$2');

      // Handle self-closing tags first (like <VideoPlayer />)
      processed = processed.replace(/<([A-Za-z][A-Za-z0-9]*)[^>]*\/>/g, (match, tag, offset) => {
        // If inside a code block, do not touch
        if (isInsideCodeBlock(processed, offset)) {
          return match;
        }
        
        // If unknown component, treat as text
        if (!KNOWN_COMPONENTS.includes(tag)) {
          return `\`${match}\``;
        }
        return match;
      });

      // Only replace unrecognized <someTag> with `"<someTag>"` if NOT inside a code block
      // This regex finds all <tag> occurrences (fixed to handle uppercase)
      processed = processed.replace(/<([A-Za-z][A-Za-z0-9]*)>/g, (match, tag, offset) => {
        // If inside a code block, do not touch
        if (isInsideCodeBlock(processed, offset)) {
          return match;
        }
        
        // If known component, check if it has a closing tag
        if (KNOWN_COMPONENTS.includes(tag)) {
          // If it doesn't have a matching closing tag, treat it as text
          if (!hasMatchingClosingTag(processed, tag, offset)) {
            return `\`<${tag}>\``;
          }
          // Otherwise, leave as-is for proper JSX parsing
          return match;
        }
        // For unknown components, always treat as text (wrap in backticks)
        // If already inside backticks, do not wrap again
        const before = processed.slice(0, offset);
        const backtickMatches = before.match(/`+/g);
        const insideBackticks = backtickMatches ? backtickMatches.reduce((acc, s) => acc + s.length, 0) % 2 === 1 : false;
        if (insideBackticks) {
          return match;
        }
        return `\`<${tag}>\``;
      });

      // This regex finds all <tag> and </tag> occurrences (fixed to handle uppercase)
      processed = processed.replace(/<\/?([A-Za-z][A-Za-z0-9]*)>/g, (match, tag, offset) => {
        // If inside a code block, do not touch
        if (isInsideCodeBlock(processed, offset)) {
          return match;
        }
        
        // If known component, check if it has a closing tag (only for opening tags)
        if (KNOWN_COMPONENTS.includes(tag)) {
          // Only check for matching closing tag for opening tags
          if (!match.startsWith('</')) {
            if (!hasMatchingClosingTag(processed, tag, offset)) {
              return `\`${match}\``;
            }
          }
          // Otherwise, leave as-is for proper JSX parsing
          return match;
        }
        // For unknown components, always treat as text (wrap in backticks)
        // If already inside backticks, do not wrap again
        const before = processed.slice(0, offset);
        const backtickMatches = before.match(/`+/g);
        const insideBackticks = backtickMatches ? backtickMatches.reduce((acc, s) => acc + s.length, 0) % 2 === 1 : false;
        if (insideBackticks) {
          return match;
        }
        return `\`${match}\``;
      });

      return {
        code: processed,
        map: null,
      };
    },
  };
}