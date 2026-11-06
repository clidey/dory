<div align="center">
  <img src="./assets/logo.svg" alt="Dory" width="88" />
  <h1>Dory</h1>
  <p><strong>Documentation that feels like part of your product.</strong></p>
  <p>Turn MDX into a polished documentation site with interactive examples,<br />API playgrounds, search, and context your AI tools can use.</p>
  <p>
    <a href="https://clidey.github.io/dory/">Explore the docs</a> ·
    <a href="https://clidey.github.io/dory/getting-started/quick-start/">Get started</a> ·
    <a href="https://clidey.github.io/dory/components/overview/">See the components</a> ·
    <a href="https://www.npmjs.com/package/@clidey/dory">npm</a>
  </p>
</div>

Dory gives product teams a complete documentation experience without maintaining a separate web application. Write your content in MDX, describe your brand and navigation in one `dory.json`, and publish a static site on the host you choose.

Your documentation stays in your repository. Your team reviews it with your code. Your readers get a consistent, searchable experience across guides, API references, and examples.

## Why teams choose Dory

| What you need | What Dory gives you |
| --- | --- |
| Docs that match your product | Clidey UX foundations, light and dark modes, brand colors, typography, and configurable navigation. |
| Examples people can understand and try | Code groups, diagrams, callouts, steps, tables, and interactive API and WebSocket playgrounds. |
| Useful context for coding agents | Published MDX, `llms.txt`, and `llms-full.txt`, plus optional MCP tools for reading and authoring documentation. |
| Help inside your application | An embeddable documentation panel that keeps search and navigation close to the task. |
| Freedom to host it yourself | Static HTML, CSS, and JavaScript. GitHub Pages, object storage, a CDN, or your own infrastructure. |
| Fewer surprises when publishing | A content check for navigation, links, assets, and metadata, with local previews before deployment. |

## See the experience

https://github.com/user-attachments/assets/5a2840ce-a0b9-41fd-8d15-3ee1d2356f07

[Browse the live documentation](https://clidey.github.io/dory/) to try navigation, search, component examples, and API references.

## Your first documentation site

```bash
pnpm add -g @clidey/dory
mkdir product-docs
cd product-docs
dory init
dory dev
```

Edit the starter page in `docs/` and configure your site in `dory.json`. Dory reloads as you write.

```text
product-docs/
├── dory.json
└── docs/
    ├── introduction.mdx
    └── logo.svg
```

When you are ready to share it:

```bash
dory check
dory build
dory preview
```

Publish the generated `dist/` directory to your static host. No Dory server is required for the static site, navigation, or search.

[Installation](https://clidey.github.io/dory/getting-started/installation/) · [Quick start](https://clidey.github.io/dory/getting-started/quick-start/) · [Site configuration](https://clidey.github.io/dory/configuration/dory-json/)

## Give readers more than a wall of text

Compose guides from code blocks, tabs, cards, callouts, steps, diagrams, tables, and mathematical notation. Import trusted JSX components for live examples with real state and events, paired with copyable source. Keep related examples together and let readers move between explanation and source.

OpenAPI and AsyncAPI references bring your operations into the same site. HTTP and WebSocket playgrounds let readers explore requests and events alongside the documentation.

[Explore the components](https://clidey.github.io/dory/components/overview/) · [Interactive JSX examples](https://clidey.github.io/dory/getting-started/custom-components/) · [HTTP playground](https://clidey.github.io/dory/playgrounds/api-playground/) · [WebSocket playground](https://clidey.github.io/dory/playgrounds/websocket-playground/)

## Make your docs useful to AI tools

Dory publishes machine-readable documentation alongside the site. Give a coding assistant the site's `llms.txt` URL to discover its pages, or use `llms-full.txt` for the combined documentation text.

For a connected authoring workflow, Dory's local MCP server can inspect a project, read and write pages, check content, build the site, and capture screenshots for review:

```bash
dory mcp config
```

Add the configuration it prints to your MCP client. A site served with `dory preview` can also expose read-only HTTP MCP for published documentation. Static hosting serves the text files; HTTP MCP needs the Dory server.

[AI and MCP workflows](https://clidey.github.io/dory/getting-started/automation/)

## Bring documentation into your product

Open relevant help in an embedded panel rather than sending readers away from their work. Keep your documentation site's search and navigation, and choose which applications are allowed to embed it.

An optional documentation assistant can answer questions with source links. It uses a separately configured server backend; model credentials stay on that server.

[Embedding](https://clidey.github.io/dory/configuration/embed/) · [Documentation chat](https://clidey.github.io/dory/configuration/chat/) · [Languages and versions](https://clidey.github.io/dory/configuration/internationalization/)

## Open source, on your terms

Dory is MIT licensed and built with Preact, Vite, and [Clidey UX](https://github.com/clidey/ux). You own your content, configuration, and generated site.

Build only trusted, reviewed MDX and component source. Static imports are executable application code; a build workspace is not a sandbox for untrusted contributions. See the [security policy](./SECURITY.md).

[Contribute to Dory](./docs/contributing.mdx) · [Report an issue](https://github.com/clidey/dory/issues) · [License](./LICENSE)
