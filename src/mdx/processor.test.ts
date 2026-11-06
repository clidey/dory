import { describe, it, expect, test } from 'vitest';
import { preprocessMdxContent, processMdxContent } from './processor';
import { preprocessMdxSource } from './preprocess';

const source = `import Demo, { Button as DemoButton } from './example.tsx';
import * as Controls from './controls.tsx';

<Demo />
<DemoButton>Try it</DemoButton>
<Controls.Toggle />
`;

test('trusted static MDX preserves default, aliased and namespace component imports', async () => {
  const result = await processMdxContent(source);
  expect(result.success).toBe(true);
  expect(result.processedContent).toContain('<Demo />');
  expect(result.processedContent).toContain('<DemoButton>Try it</DemoButton>');
  expect(result.processedContent).toContain('<Controls.Toggle />');
  expect(result.processedContent).not.toContain('`<Demo');
});

test('imports shown in code fences do not authorize unknown JSX components', async () => {
  const result = await preprocessMdxContent("```tsx\nimport Demo from './example.tsx';\n```\n\n<Demo />");
  expect(result.success).toBe(true);
  expect(result.processedContent).toContain('`<Demo />`');
});

test('unimported components keep the existing text behavior in static MDX', async () => {
  const result = await preprocessMdxContent("import Demo from './example.tsx';\n\n<Demo />\n<Unregistered />");
  expect(result.processedContent).toContain('<Demo />');
  expect(result.processedContent).toContain('`<Unregistered />`');
});

test('embedded preprocessing does not trust component names from MDX imports', () => {
  const result = preprocessMdxSource(source);
  expect(result).toContain('`<Demo />`');
  expect(result).toContain('`<Controls.Toggle />`');
});

test('malformed import syntax reports a compile error instead of bypassing preprocessing', async () => {
  const result = await preprocessMdxContent('import { Broken from "./example.tsx";\n\n<Broken />');
  expect(result.success).toBe(false);
  expect(result.error).toBeInstanceOf(Error);
});


test('imported components with props coexist with nested JSX and prose placeholders', async () => {
  const result = await processMdxContent(`import Demo, { Child } from './example.tsx';

<Demo start={0}><Child /></Demo>

Replace <token> with your key.
`);
  expect(result.success).toBe(true);
  expect(result.processedContent).toContain('<Demo start={0}><Child /></Demo>');
});

test('multiline imports work while tilde-fenced imports stay inert', async () => {
  const result = await processMdxContent(`import {
  Button as DemoButton,
} from './example.tsx';

<DemoButton>Try it</DemoButton>

~~~tsx
import Unregistered from './other.tsx';
~~~

<Unregistered />
`);
  expect(result.success).toBe(true);
  expect(result.processedContent).toContain('<DemoButton>Try it</DemoButton>');
  expect(result.processedContent).toContain('`<Unregistered />`');
});


describe('existing preprocessing behavior', () => {
  it('strips YAML frontmatter', async () => {
    const result = await preprocessMdxContent('---\ntitle: Hello\n---\n# Heading\n');
    expect(result.success).toBe(true);
    expect(result.processedContent).not.toContain('title: Hello');
    expect(result.processedContent).toContain('# Heading');
  });
  it('converts angle bracket URLs while preserving fenced and inline code', async () => {
    const result = await preprocessMdxContent('Visit <https://example.com/docs> now');
    expect(result.processedContent).toBe('Visit [https://example.com/docs](https://example.com/docs) now');
    const fenced = '```\ncurl <https://example.com>\n```\n';
    expect((await preprocessMdxContent(fenced)).processedContent).toBe(fenced);
    const inline = 'Use `<https://example.com>` here';
    expect((await preprocessMdxContent(inline)).processedContent).toBe(inline);
  });
});

test('preserves original fence-state behavior across multiple code blocks', async () => {
  const input = ['```', '<https://in-block.com>', '```', '<https://outside.com>', '```', '<https://in-block-2.com>', '```'].join('\n');
  const result = await preprocessMdxContent(input);
  expect(result.success).toBe(true);
  expect(result.processedContent).toContain('<https://in-block.com>');
  expect(result.processedContent).toContain('<https://in-block-2.com>');
  expect(result.processedContent).toContain('[https://outside.com](https://outside.com)');
});


test('comments, multiline code spans and exported strings do not register fake imports', async () => {
  for (const prefix of [
    "{/*\nimport Demo from './demo.tsx';\n*/}",
    "`example\nimport Demo from './demo.tsx';\nexample`",
    "export const example = `\nimport Demo from './demo.tsx';\n`;",
  ]) {
    const result = await preprocessMdxContent(prefix + '\n\n<Demo />');
    expect(result.success).toBe(true);
    expect(result.processedContent).toContain('`<Demo />`');
  }
});

test('import-looking prose without an MDX ESM declaration does not register names', async () => {
  const result = await processMdxContent("import\nDemo from './demo.tsx';\n\n<Demo />");
  expect(result.success).toBe(true);
  expect(result.processedContent).toContain('`<Demo />`');
});


test('provisional names are AST-verified alongside real JSX with props', async () => {
  const input = [
    "import Real from './real.tsx';",
    '',
    '<Real count={0}>Try it</Real>',
    '',
    '{/*',
    "import Fake from './fake.tsx';",
    '*/}',
    '',
    'export const example = `',
    "import StringFake from './fake.tsx';",
    '`;',
    '',
    '<Fake />',
    '<StringFake />',
  ].join('\n');
  const result = await processMdxContent(input);
  expect(result.success).toBe(true);
  expect(result.processedContent).toContain('<Real count={0}>Try it</Real>');
  expect(result.processedContent).toContain('`<Fake />`');
  expect(result.processedContent).toContain('`<StringFake />`');
});
