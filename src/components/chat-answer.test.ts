import { h } from 'preact';
import render from 'preact-render-to-string';
import { describe, expect, it, vi } from 'vitest';
import { ChatAnswer, type ChatMedia } from './chat-answer';

vi.mock('@clidey/ux', () => ({
  CopyButton: ({ text, tooltipLabel }: { text: string; tooltipLabel: string }) => h('button', { 'data-copy': text }, tooltipLabel),
}));
vi.mock('../mdx/mermaid', () => ({
  MermaidRenderer: ({ content, untrusted }: { content: string; untrusted: boolean }) => h('div', { 'data-diagram': content, 'data-untrusted': untrusted }),
}));

const image: ChatMedia = { id: 'M1', type: 'image', url: '/assets/setup.png', alt: 'Connection settings', sourceId: 'S1' };

describe('ChatAnswer', () => {
  it('renders Markdown structure, links, tables and copyable code', () => {
    const html = render(h(ChatAnswer, { text: '# Setup\n\n1. **Connect** with `postgres`\n2. Read the [guide](/guide)\n\n| Option | Required |\n| --- | --- |\n| Host | Yes |\n\n```sh\npnpm run build\n```' }));
    expect(html).toContain('<h3');
    expect(html).toContain('<ol');
    expect(html).toContain('<strong');
    expect(html).toContain('href="/guide"');
    expect(html).toContain('<table');
    expect(html).toContain('<th');
    expect(html).toContain('data-copy="pnpm run build"');
    expect(html).toContain('Copy code');
  });

  it('renders Mermaid with the shared strict renderer and offers its source', () => {
    const html = render(h(ChatAnswer, { text: '```mermaid\nflowchart LR\nA --> B\n```' }));
    expect(html).toContain('data-diagram="flowchart LR');
    expect(html).toContain('data-untrusted="true"');
    expect(html).toContain('Copy diagram source');
    expect(html).toContain('Diagram source');
  });

  it('never evaluates HTML or loads media selected only by model output', () => {
    const html = render(h(ChatAnswer, { text: '<script>alert(1)</script>\n\n![Tracking](https://tracker.example/pixel.png)\n\n[unsafe](javascript:alert%281%29)\n\n![data](data:image/svg+xml,evil)\n\n[encoded](java&#x73;cript:alert%281%29)' }));
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('tracker.example');
    expect(html).not.toContain('href=');
    expect(html).toContain('Tracking');
  });

  it('resolves approved media IDs and avoids duplicating referenced images', () => {
    const html = render(h(ChatAnswer, { text: '![Connection](media:M1)', media: [image] }));
    expect(html).toContain('src="/assets/setup.png"');
    expect(html).toContain('alt="Connection settings"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html.match(/<img /g)).toHaveLength(1);
  });

  it('renders source-approved image, video and audio with deliberate playback', () => {
    const html = render(h(ChatAnswer, { text: 'Follow this walkthrough.', media: [image,
      { ...image, id: 'M2', type: 'video', url: 'https://docs.example/demo.mp4' },
      { ...image, id: 'M3', type: 'audio', url: '/assets/walkthrough.mp3' },
      { ...image, id: 'M4', url: 'javascript:alert(1)' },
      { ...image, id: 'M5', url: '//tracker.example/pixel.png' },
    ] }));
    expect(html).toContain('<figure');
    expect(html).toContain('<video');
    expect(html).toContain('<audio');
    expect(html.match(/preload="none"/g)).toHaveLength(2);
    expect(html).not.toContain('autoplay');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('tracker.example');
  });
});
