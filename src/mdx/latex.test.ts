import { describe, expect, it } from 'vitest';
import { createElement } from 'preact';
import { renderToString } from 'preact-render-to-string';
import katex from 'katex';
import { Latex, renderLatexExpression } from './latex';

describe('LaTeX rendering', () => {
  it('server-renders a readable display fallback with the same client shell', () => {
    const html = renderToString(createElement(Latex, { children: 'E = mc^2' }));
    expect(html).toContain('dory-latex not-prose');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('data-latex-fallback');
    expect(html).toContain('E = mc^2');
    expect(html).not.toContain('animate-spin');
  });

  it('keeps the inline fallback inline and escapes source text', () => {
    const html = renderToString(createElement(Latex, { inline: true, children: '<img src=x onerror=alert(1)>' }));
    expect(html).toMatch(/^<span /);
    expect(html).not.toContain('<div');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });

  it('renders complex math with KaTeX and the requested mode', () => {
    const expression = String.raw`\frac{a}{b}`;
    expect(renderLatexExpression(katex, expression, false)).toContain('katex-display');
    const inline = renderLatexExpression(katex, expression, true);
    expect(inline).toContain('mfrac');
    expect(inline).not.toContain('katex-display');
  });

  it('does not allow formulas to create trusted links, HTML classes, or image requests', () => {
    expect(renderLatexExpression(katex, String.raw`\href{javascript:alert(1)}{click}`, true)).not.toMatch(/href=["']javascript:/);
    expect(renderLatexExpression(katex, String.raw`\htmlClass{injected}{x}`, false)).not.toMatch(/class=["']injected/);
    expect(renderLatexExpression(katex, String.raw`\includegraphics{https://example.test/tracker.png}`, false)).not.toContain('<img');
  });
});
