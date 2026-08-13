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
  'APIPlayground', 'WebSocketPlayground', 'AsyncAPI', 'Source', 'Tag',
  // Common HTML elements that should be preserved
  'div', 'span', 'br', 'hr', 'strong', 'em', 'b', 'i', 'u', 's',
  'blockquote', 'nav', 'section', 'article', 'header', 'footer', 'main',
  'aside', 'figure', 'figcaption', 'details', 'summary', 'mark', 'small',
  'del', 'ins', 'sub', 'sup', 'kbd', 'samp', 'var', 'time', 'abbr',
  'address', 'cite', 'q', 'dfn'
];

/**
 * Returns true if the character at `idx` is inside a fenced code block.
 * Fences only count when they start a line (optionally indented) — inline
 * triple backticks in prose do not open or close a block. Offsets on a
 * fence line itself are treated as inside, so fence lines are never modified.
 */
export function isInsideCodeBlock(code: string, idx: number): boolean {
  let inFence = false;
  let pos = 0;
  for (const line of code.split('\n')) {
    const lineEnd = pos + line.length;
    const isFenceLine = /^\s*```/.test(line);
    if (idx >= pos && idx <= lineEnd) {
      return inFence || isFenceLine;
    }
    if (isFenceLine) {
      inFence = !inFence;
    }
    pos = lineEnd + 1;
  }
  return inFence;
}

/**
 * Returns true if the character at `idx` is inside an inline code span.
 * Follows CommonMark pairing: a run of N backticks opens a span closed by
 * the next run of exactly N backticks; unmatched runs are literal text.
 * Backtick runs inside fenced code blocks are ignored.
 */
export function isInsideCodeSpan(code: string, idx: number): boolean {
  const runs: { index: number; length: number }[] = [];
  const re = /`+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    if (!isInsideCodeBlock(code, m.index)) {
      runs.push({ index: m.index, length: m[0].length });
    }
  }

  let i = 0;
  while (i < runs.length) {
    const open = runs[i];
    if (open.index >= idx) return false;

    // Find the matching closer: the next run of the same length
    let j = i + 1;
    while (j < runs.length && runs[j].length !== open.length) j++;

    if (j < runs.length) {
      if (idx > open.index && idx < runs[j].index) return true;
      i = j + 1;
    } else {
      // Unmatched run is literal text, not a span opener
      i++;
    }
  }
  return false;
}

// Helper: checks if a known component tag has a matching closing tag,
// tracking nesting depth so nested same-name tags pair up correctly.
function hasMatchingClosingTag(code: string, tagName: string, openingTagOffset: number): boolean {
  const re = new RegExp(`</?${tagName}>`, 'gi');
  re.lastIndex = openingTagOffset + `<${tagName}>`.length;
  let depth = 1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    // Tags inside code blocks or inline code spans are literal text
    if (isInsideCodeBlock(code, m.index) || isInsideCodeSpan(code, m.index)) {
      continue;
    }
    if (m[0].startsWith('</')) {
      depth--;
      if (depth === 0) return true;
    } else {
      depth++;
    }
  }
  return false;
}

// Allow any <[a-z][a-z0-9]*> tag inside code blocks to be left as-is (not parsed as JSX).
export function preprocessMdxTags() {
  return {
    name: 'preprocess-mdx-tags',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (!id.endsWith('.mdx')) return;

      // Remove leading whitespace from code fence blocks.
      // Only horizontal whitespace: \s would also swallow the \n of CRLF
      // line endings (multiline ^ matches after \r in JS).
      let processed = code.replace(/^([ \t]+)(```\w*)/gm, '$2');

      // Handle self-closing tags first (like <VideoPlayer />)
      processed = processed.replace(/<([A-Za-z][A-Za-z0-9]*)[^>]*\/>/g, (match, tag, offset) => {
        // If inside a code block or inline code span, do not touch
        if (isInsideCodeBlock(processed, offset) || isInsideCodeSpan(processed, offset)) {
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
        // If inside a code block or inline code span, do not touch
        if (isInsideCodeBlock(processed, offset) || isInsideCodeSpan(processed, offset)) {
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
        return `\`<${tag}>\``;
      });

      // This regex finds all <tag> and </tag> occurrences (fixed to handle uppercase)
      processed = processed.replace(/<\/?([A-Za-z][A-Za-z0-9]*)>/g, (match, tag, offset) => {
        // If inside a code block or inline code span (including spans added
        // by the previous pass), do not touch
        if (isInsideCodeBlock(processed, offset) || isInsideCodeSpan(processed, offset)) {
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
        return `\`${match}\``;
      });

      // Second pass: handle malformed tags that contain invalid characters
      // This specifically targets cases like <AccordionNo Documents'"> 
      processed = processed.replace(/<([a-z][a-z0-9]*)\s+[^>]*['"][^>]*>/gi, (match, _tag, offset) => {
        // If inside a code block, do not touch
        if (isInsideCodeBlock(processed, offset)) {
          return match;
        }
        
        // If already inside backticks, do not wrap again
        const before = processed.slice(0, offset);
        const backtickMatches = before.match(/`+/g);
        const insideBackticks = backtickMatches ? backtickMatches.reduce((acc, s) => acc + s.length, 0) % 2 === 1 : false;
        if (insideBackticks) {
          return match;
        }
        
        // Check if this looks like malformed content (has quotes not in proper attribute format)
        const content = match.slice(1, -1); // Remove < and >
        const hasProperAttributes = /\w+\s*=\s*(['"][^'"]*['"]|\{[^}]*\})/.test(content);
        
        // If it doesn't have proper attribute syntax, wrap it as text
        if (!hasProperAttributes) {
          return `\`${match}\``;
        }
        
        return match;
      });

      return {
        code: processed,
        map: null,
      };
    },
  };
}
