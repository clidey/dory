import { describe, it, expect } from 'vitest';
import { preprocessMdxContent } from './processor';

async function run(input: string): Promise<string> {
  const result = await preprocessMdxContent(input);
  expect(result.success).toBe(true);
  return result.processedContent!;
}

describe('preprocessMdxContent', () => {
  it('strips YAML frontmatter', async () => {
    const output = await run('---\ntitle: Hello\n---\n# Heading\n');
    expect(output).not.toContain('title: Hello');
    expect(output).toContain('# Heading');
  });

  it('converts URLs in angle brackets to markdown links', async () => {
    const output = await run('Visit <https://example.com/docs> now');
    expect(output).toBe('Visit [https://example.com/docs](https://example.com/docs) now');
  });

  it('preserves angle-bracket URLs inside fenced code blocks', async () => {
    const input = '```\ncurl <https://example.com>\n```\n';
    expect(await run(input)).toBe(input);
  });

  it('preserves angle-bracket URLs inside inline code', async () => {
    const input = 'run `curl <https://example.com>` locally';
    expect(await run(input)).toBe(input);
  });

  it('tracks code-block state across multiple fences', async () => {
    const input = [
      '```',
      '<https://in-block.com>',
      '```',
      '<https://outside.com>',
      '```',
      '<https://in-block-2.com>',
      '```',
    ].join('\n');
    const output = await run(input);
    expect(output).toContain('<https://in-block.com>');
    expect(output).toContain('<https://in-block-2.com>');
    expect(output).toContain('[https://outside.com](https://outside.com)');
  });
});
