<div align="center">
  <img src="./assets/logo.svg" alt="Dory Logo" width="100" />
</div>

# Dory

> 🐟 A lightweight static site generator for technical documentation.

Dory is a lightweight static site generator built for developers who want fast, clean, and customizable documentation — without the overhead of server-side rendering, complex CI/CD setups, or cloud-specific constraints.

Built with [Preact](https://preactjs.com/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Mermaid](https://mermaid.js.org/), and [TypeScript](https://www.typescriptlang.org/).


## 🚀 Why Dory?

We created Dory while building a documentation platform and getting frustrated by bloated frameworks, slow build times, and cryptic deployment errors.

Dory is:

- 🧠 **Simple** — Drop in `.mdx` files and configure one `dory.json`.
- ⚡ **Fast** — Instant hot reload in dev, quick static builds for prod.
- 🌐 **Portable** — No SSR, no lock-in, deploy anywhere.
- 🧩 **Flexible** — Hackable theme, readable codebase, minimal magic.


## 🎬 Quick Demo

https://github.com/user-attachments/assets/5a2840ce-a0b9-41fd-8d15-3ee1d2356f07

## ✨ Features

- 📄 Write docs in `.mdx` (Markdown + JSX)
- 🧭 Configure site structure with a single `dory.json`
- 🧪 Built-in components for layout, navigation, and code highlighting
- 🔁 Instant hot-reload during development
- 📊 Mermaid support for diagrams and flows
- 🎨 Customizable via Tailwind and minimal theme overrides
- 🌍 Deploy to Netlify, Vercel, S3, GitHub Pages — your call
- 🌐 HTTP client for testing API endpoints (automatic inference from openapi.json)


## 📦 CLI Installation

Install Dory globally to use the CLI tool:

```bash
pnpm add -g @clidey/dory
```

### CLI Usage

Once installed, you can use the `dory` command:

```bash
mkdir my-docs && cd my-docs
dory init       # Create dory.json and docs/introduction.mdx
dory dev        # Live authoring preview
dory check      # Validate navigation, links, assets, and metadata
dory build      # Generate dist/
dory preview    # Serve the build, including optional documentation chat
```

Keep pages in `docs/` and run commands from the directory containing `dory.json`. Existing flat projects still work. Builds use an isolated workspace and leave the installed package untouched. See [documentation chat](docs/configuration/chat.mdx) for a server-side model and [languages and versions](docs/configuration/internationalization.mdx) for localized content.

#### `dory build`
Builds your documentation site:
- Checks for `dory.json` in current directory
- Clears and prepares the `docs` folder
- Copies configuration to `docs` folder
- Runs the build process
- Creates `dist` folder with build output

```bash
dory build
```

#### `dory preview`
Previews the built documentation site:
- Requires `dist` folder (run `dory build` first)
- Starts a local preview server

```bash
dory preview
```

#### `dory verify:content`
Verifies that MDX content compiles without errors:
- Silent on success (no output means no errors)
- Shows detailed error messages on failure
- Uses the same preprocessing as the main build
- Perfect for automated testing and debugging

```bash
# Verify content directly
dory verify:content --content "# Hello World\n\nThis is a test."

# Verify content from file (recommended for complex content)
dory verify:content --file content.mdx

# Development repository usage:
pnpm exec tsx bin/dory.ts verify:content --file content.mdx
```

#### `dory help`
Shows CLI usage information:

```bash
dory help
```


## 🧑‍💻 Development Setup

Follow these steps to set up and preview the documentation locally, as well as build a static site for deployment.

### 1️⃣ Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/clidey/dory.git
cd dory
````


### 2️⃣ Install Dependencies

Install all required dependencies using `pnpm`:

```bash
pnpm install
```

Make sure you have `pnpm` installed. If not, you can install it via:

```bash
npm install -g pnpm
```

---

### 3️⃣ Browse Dory's Own Documentation

This repository already contains Dory's documentation in `docs/`. Edit its MDX
pages and `docs/dory.json` to work on the site. To create documentation for a
separate project, use `dory init` in a new folder rather than replacing these pages.

---

### 4️⃣ Start Development Server

Start the development server to preview the documentation locally:

```bash
pnpm run dev
```

This will launch a local server (typically at `http://localhost:3000/dory/`) where you can preview and edit your documentation in real-time.

---

### 5️⃣ Build Static Site for Production

To generate a static version of the site for production deployment:

```bash
pnpm run build
```

This will create a `dist` directory containing the fully built static site, ready to be served.


## GitHub Pages for Dory's Docs

The documentation workflow builds the docs from this repository's source. Its
Pages target is `https://clidey.github.io/dory/`, configured with `url` and
`basePath` in `docs/dory.json`.

Preview the production build locally before reviewing or publishing changes:

```sh
pnpm run build
node bin/dist/dory.js check
pnpm run preview --host 127.0.0.1 --port 3188 --strictPort
```

Open `http://127.0.0.1:3188/dory/`. Review the code and preview with the user
before pushing. Once approved, the workflow validates pull requests and deploys
approved changes pushed to `main`. A repository administrator must enable Pages
with **GitHub Actions** as its source before the first deployment.

Pages serves the static documentation and search. Optional server-backed chat,
analytics collection, and HTTP MCP require a separate server.

## 🐳 Docker Deployment (Optional)

You can use our official Docker image `clidey/dory` to create a static server. Simply create a Dockerfile inside the project and build the following Dockerfile:

```dockerfile
FROM clidey/dory
WORKDIR /app
COPY . .
RUN dory build
CMD ["dory", "preview"]
```

You can also build and run the static site inside a Docker container using Nginx:

### Build Docker Image

```bash
docker build -f k8s/Dockerfile --tag docs:1.0.0 .
```

### Run Docker Container

```bash
docker run -it -p 8080:80 docs:1.0.0
```

> The site will be available at `http://localhost:8080` inside your browser.

## 📂 Notes

* `pnpm run build` creates the static site inside the `dist` folder, which can be served using any static file server.
* The Docker image uses Nginx to serve the contents of the `dist` folder.


## 🔮 Roadmap

We’re actively improving Dory. Here’s what’s on deck:

* [ ] 📚 **Full Documentation** — comprehensive guides, API docs, and examples
* [ ] 🎨 **Themes** — full theming support with a flexible theme API
* [ ] 🌐 **Multi-language Support** — internationalization (i18n) & localization (l10n)
* [ ] 🚀 **GraphQL Client** — integrated GraphQL playground and client support
