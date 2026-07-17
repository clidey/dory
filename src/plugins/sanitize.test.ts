import { describe, it, expect } from 'vitest';
import { preprocessMdxTags, isInsideCodeBlock, isInsideCodeSpan } from './sanitize';

/** Run the preprocessor over MDX input and return the transformed code. */
function run(input: string): string {
  const result = preprocessMdxTags().transform(input, 'test.mdx');
  return (result as { code: string }).code;
}

describe('isInsideCodeBlock', () => {
  it('detects content between line-start fences', () => {
    const code = '```\nconst x = 1;\n```\nafter';
    expect(isInsideCodeBlock(code, code.indexOf('const'))).toBe(true);
    expect(isInsideCodeBlock(code, code.indexOf('after'))).toBe(false);
  });

  it('ignores inline triple backticks (not at line start)', () => {
    const code = 'Use ``` to fence code blocks.\nplain text here';
    expect(isInsideCodeBlock(code, code.indexOf('plain'))).toBe(false);
  });

  it('handles indented fences and CRLF line endings', () => {
    const code = 'a\r\n  ```js\r\ninside\r\n  ```\r\nb';
    expect(isInsideCodeBlock(code, code.indexOf('inside'))).toBe(true);
    expect(isInsideCodeBlock(code, code.indexOf('b'))).toBe(false);
  });
});

describe('isInsideCodeSpan', () => {
  it('detects content inside a single-backtick span', () => {
    const code = 'a `<div>` b';
    expect(isInsideCodeSpan(code, code.indexOf('<div>'))).toBe(true);
    expect(isInsideCodeSpan(code, code.indexOf('b'))).toBe(false);
  });

  it('pairs equal-length backtick runs (double-backtick span with inner backtick)', () => {
    const code = 'A ``b ` c`` and <Unknown> tag';
    expect(isInsideCodeSpan(code, code.indexOf('b `'))).toBe(true);
    // The single backtick inside the double-backtick span must not
    // open a new span that swallows the rest of the line.
    expect(isInsideCodeSpan(code, code.indexOf('<Unknown>'))).toBe(false);
  });

  it('treats an unmatched backtick run as literal text', () => {
    const code = 'odd ` backtick <Foo> here';
    expect(isInsideCodeSpan(code, code.indexOf('<Foo>'))).toBe(false);
  });
});

describe('preprocessMdxTags', () => {
  it('returns undefined for non-mdx files', () => {
    expect(preprocessMdxTags().transform('<Foo>', 'file.ts')).toBeUndefined();
  });

  it('escapes bare unknown pseudo-tags in backticks', () => {
    expect(run('This <UnknownTag> is not JSX')).toBe('This `<UnknownTag>` is not JSX');
  });

  it('preserves known components with matched closing tags', () => {
    expect(run('<Note>hello</Note>')).toBe('<Note>hello</Note>');
  });

  it('escapes known components without a closing tag', () => {
    expect(run('<div>no closing tag')).toBe('`<div>`no closing tag');
  });

  it('preserves nested same-name tags without leaking an orphan closer', () => {
    const input = '<div><div>inner</div></div>';
    expect(run(input)).toBe(input);
  });

  it('leaves tags inside fenced code blocks untouched', () => {
    const input = '```\n<UnknownTag>\n<div>\n```\n';
    expect(run(input)).toBe(input);
  });

  it('handles CRLF input with fenced code blocks', () => {
    const input = 'text\r\n```\r\n<UnknownTag>\r\n```\r\n';
    expect(run(input)).toBe(input);
  });

  it('does not corrupt double-backtick code spans', () => {
    const input = 'A ``b `<div>` c`` d';
    expect(run(input)).toBe(input);
  });

  it('still escapes tags after a double-backtick span (no parity confusion)', () => {
    expect(run('A ``b ` c`` and <Unknown> tag')).toBe('A ``b ` c`` and `<Unknown>` tag');
  });

  it('does not treat inline triple backticks as a code fence', () => {
    expect(run('Use ``` to fence.\n\n<Unknown>')).toBe('Use ``` to fence.\n\n`<Unknown>`');
  });

  it('escapes unknown self-closing tags and preserves known ones', () => {
    expect(run('<VideoPlayer src="x" />')).toBe('`<VideoPlayer src="x" />`');
    expect(run('line<br/>break')).toBe('line<br/>break');
  });

  it('leaves tags inside single-backtick inline code untouched', () => {
    const input = 'use `<UnknownTag>` in your doc';
    expect(run(input)).toBe(input);
  });
});
