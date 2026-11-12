import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createServer } = await import('vite');
const { chromium } = require('playwright-core');
const answer = [
  '## Publish a documentation page',
  '1. Write MDX.\n2. Build the site.',
  '```mermaid\nflowchart LR\nA[Write MDX] --> B[Build site]\n```',
  '```mermaid\nsequenceDiagram\nAuthor->>Dory: Build documentation\nDory-->>Author: Static site\n```',
  '| Step | Command |\n| --- | --- |\n| Build | `pnpm run build` |',
  '```sh\npnpm run build\n```',
  '![Unapproved](https://tracker.invalid/pixel.png)',
  '<img src="https://tracker.invalid/html.png" onerror="window.__unsafe=true">',
].join('\n\n');
const media = [
  { id: 'S1M1', type: 'image', url: '/__chat_media.svg', alt: 'Documentation workflow', sourceId: 'S1' },
  { id: 'S1M2', type: 'video', url: '/__chat_media.mp4', alt: 'Video walkthrough', sourceId: 'S1' },
  { id: 'S1M3', type: 'audio', url: '/__chat_media.mp3', alt: 'Audio walkthrough', sourceId: 'S1' },
];
const fixture = `
import { h, render } from 'preact';
import '@clidey/ux/styles.css';
import '@clidey/ux/brand.css';
import '@clidey/ux/theme-fonts.css';
import './app.css';
import './theme.scss';
import 'virtual:dory-styles';
import { ChatAssistant, useChatAssistant } from './components/chat-assistant';
import { ChatAnswer } from './components/chat-answer';
import { loadColors } from './utils/colors';
loadColors();
document.documentElement.classList.add('dark');
const transport = {
  status: async () => true,
  ask: async () => ({answer: ${JSON.stringify(answer)}, media: ${JSON.stringify(media)}, citations: [{id:'S1',title:'Build guide',url:'/guide',excerpt:'Build your MDX documentation.'}],followUps:[]})
};
function Fixture() {
  const chat = useChatAssistant({transport});
  return h('main', {className:'mx-auto max-w-5xl p-6 bg-card text-foreground'},
    h(ChatAssistant,{chat,onNavigate:()=>{},onSearch:()=>{},siteName:'Dory',questions:['Explain the build workflow']}),
    h('section', {id:'unsafe-diagram'}, h(ChatAnswer,{text:'\x60\x60\x60mermaid\\n%%{init: {"securityLevel": "loose"}}%%\\nflowchart LR\\nA --> B\\n\x60\x60\x60'})));
}
render(h(Fixture), document.getElementById('app'));
`;

const server = await createServer({
  configFile: `${process.cwd()}/vite.config.ts`,
  plugins: [{
    name: 'chat-media-regression-fixture',
    enforce: 'pre',
    transform(_source, id) { if (id.endsWith('/src/main.tsx')) return fixture; },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.endsWith('/__chat_media.svg')) return next();
        res.setHeader('Content-Type', 'image/svg+xml');
        res.end('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="120"><rect width="480" height="120" fill="#528ff4"/><text x="30" y="70" font-size="24">Write MDX → Build → Publish</text></svg>');
      });
    },
  }],
  server: { host: '127.0.0.1', port: 0 },
});

await server.listen();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.setDefaultTimeout(30_000);
  const externalRequests = [];
  page.on('request', request => { if (request.url().includes('tracker.invalid')) externalRequests.push(request.url()); });
  await page.goto(server.resolvedUrls.local[0]);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Explain the build workflow' }).click();
  const diagrams = page.locator('.dory-chat-answer .mermaid svg');
  await diagrams.nth(1).waitFor();
  assert.equal(await diagrams.count(), 2);
  assert.equal(await page.locator('.dory-chat-answer table').count(), 1);
  const image = page.getByRole('img', { name: 'Documentation workflow' });
  await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('img[alt="Documentation workflow"]')?.naturalWidth === 480, undefined, { timeout: 30_000 });
  assert.equal(await page.locator('video[controls][preload="none"]').count(), 1);
  assert.equal(await page.locator('audio[controls][preload="none"]').count(), 1);
  assert.equal(await page.locator('[autoplay], .dory-chat-answer iframe, .dory-chat-answer script').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Copy code', exact: true }).count(), 1);
  await page.getByRole('button', { name: 'Copy code', exact: true }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'pnpm run build');
  assert.equal(await page.getByRole('button', { name: 'Copy diagram source', exact: true }).count(), 3);
  assert.equal(await page.locator('#unsafe-diagram .mermaid svg').count(), 0);
  await page.getByText('This diagram contains unsupported configuration or interactive content.', { exact: true }).waitFor();
  assert.deepEqual(externalRequests, []);
  assert.equal(await page.evaluate(() => window.__unsafe), undefined);
  const darkFill = await diagrams.first().locator('.node rect').first().evaluate(node => getComputedStyle(node).fill);
  await page.evaluate(() => document.documentElement.classList.remove('dark'));
  await page.waitForFunction(dark => {
    const node = document.querySelector('.dory-chat-answer .mermaid svg .node rect');
    return node && getComputedStyle(node).fill !== dark;
  }, darkFill, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Copy code', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/dory-chat-media-light.png', fullPage: true });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForFunction(dark => {
    const node = document.querySelector('.dory-chat-answer .mermaid svg .node rect');
    return node && getComputedStyle(node).fill === dark;
  }, darkFill, { timeout: 30_000 });
  await page.screenshot({ path: '/tmp/dory-chat-media-dark.png', fullPage: true });
  console.log('Chat transport, Mermaid, theme adaptation, tables, approved media, and unsafe output checks passed.');
} finally {
  await browser.close();
  await server.close();
}
