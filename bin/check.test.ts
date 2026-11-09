import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { checkProject } from './check';

const projects: string[] = [];

function project(layout: 'root' | 'docs' = 'root'): { root: string; content: string } {
  const root = mkdtempSync(join(tmpdir(), 'dory-check-'));
  projects.push(root);
  const content = layout === 'docs' ? join(root, 'docs') : root;
  mkdirSync(content, { recursive: true });
  writeFileSync(join(root, 'dory.json'), JSON.stringify({ name: 'Example', navigation: { tabs: [{ tab: 'Guides', groups: [{ group: 'Start', pages: ['intro'] }] }] } }));
  writeFileSync(join(content, 'intro.mdx'), '---\ntitle: Intro\ndescription: Start here\n---\n# Intro\n\n## First step\n\n[Jump](#first-step)\n');
  return { root, content };
}

afterEach(() => {
  for (const root of projects.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('checkProject', () => {
  it.each(['root', 'docs'] as const)('accepts valid %s content layout', layout => {
    const { root } = project(layout);
    expect(checkProject(root).errors).toBe(0);
  });

  it('reports navigation, frontmatter, broken route, and missing anchor', () => {
    const { root, content } = project();
    writeFileSync(join(root, 'dory.json'), JSON.stringify({ name: 'Example', navigation: { tabs: [{ groups: [{ pages: ['intro', 'gone'] }] }] } }));
    writeFileSync(join(content, 'intro.mdx'), '---\ndescription: Start here\n---\n# Intro\n\n[Missing](/gone)\n[Anchor](#gone)\n');
    const messages = checkProject(root).issues.map(issue => issue.message);
    expect(messages).toContain('Frontmatter title is required');
    expect(messages).toContain('Navigation page does not exist: gone');
    expect(messages).toContain('Broken local link: /gone');
    expect(messages).toContain('Missing anchor #gone in /intro');
  });

  it('resolves relative assets and ignores fenced examples', () => {
    const { root, content } = project('docs');
    mkdirSync(join(content, 'assets'));
    writeFileSync(join(content, 'assets', 'image.svg'), '<svg/>');
    writeFileSync(join(content, 'intro.mdx'), '---\ntitle: Intro\ndescription: Start here\n---\n![Image](./assets/image.svg)\n```mdx\n[Example](/missing)\n```\n');
    expect(checkProject(root).errors).toBe(0);
  });

  it('checks explicitly translated navigation without requiring every translation', () => {
    const { root, content } = project('docs');
    mkdirSync(join(content, 'fr'));
    writeFileSync(join(content, 'fr', 'intro.mdx'), '---\ntitle: Introduction\ndescription: Commencer\n---\n# Introduction\n');
    const french = { code: 'fr', label: 'Français', navigation: { tabs: [{ tab: 'Guides', groups: [{ group: 'Start', pages: ['intro'] }] }] } };
    const config = {
      name: 'Example',
      navigation: { tabs: [{ tab: 'Guides', groups: [{ group: 'Start', pages: ['intro'] }] }] },
      i18n: {
        defaultLocale: 'en',
        locales: [
          { code: 'en', label: 'English' },
          french,
        ],
      },
    };
    writeFileSync(join(root, 'dory.json'), JSON.stringify(config));
    expect(checkProject(root).errors).toBe(0);
    french.navigation.tabs[0].groups[0].pages = ['missing'];
    writeFileSync(join(root, 'dory.json'), JSON.stringify(config));
    expect(checkProject(root).issues.map(issue => issue.message)).toContain('Locale fr navigation page does not exist: missing');
  });
});

describe('global stylesheet configuration', () => {
  it.each(['root', 'docs'] as const)('checks styles from the %s content directory', layout => {
    const { root, content } = project(layout);
    const configPath = join(root, 'dory.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    config.styles = ['./custom.css'];
    writeFileSync(configPath, JSON.stringify(config));
    expect(checkProject(root).issues.some(issue => issue.message.includes('Stylesheet not found'))).toBe(true);
    writeFileSync(join(content, 'custom.css'), 'body { color: red; }');
    expect(checkProject(root).errors).toBe(0);
  });
});
