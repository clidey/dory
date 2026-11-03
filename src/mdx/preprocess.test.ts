import { expect, test } from 'vitest';
import { preprocessMdxSource } from './preprocess';

test('page title is rendered by the page frame without repeating in MDX', () => {
  const result = preprocessMdxSource('---\ntitle: "Installation"\n---\n# Installation\n\n## Setup\nInstall it.');
  expect(result).not.toMatch(/^# Installation$/m);
  expect(result).toContain('## Setup');
  expect(result).toContain('Install it.');
});

test('keeps code examples, distinct headings and pages without a frontmatter title', () => {
  const result = preprocessMdxSource('---\ntitle: Guide\n---\n```md\n# Guide\n```\n# A different heading');
  expect(result).toContain('```md\n# Guide\n```');
  expect(result).toContain('# A different heading');
  expect(preprocessMdxSource('# Guide')).toContain('# Guide');
});
