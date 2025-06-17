<div align="center">
  <img src="./assets/dory_logo.png" alt="Dory Logo" width="200" />
</div>

# Dory

> 🐟 A lightweight static site generator for technical documentation.

Dory is a lightweight static site generator built for developers who want fast, clean, and customizable documentation — without the overhead of server-side rendering, complex CI/CD setups, or cloud-specific constraints.

Built with [Preact](https://preactjs.com/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Mermaid](https://mermaid.js.org/), and [TypeScript](https://www.typescriptlang.org/).

---

## 🚀 Why Dory?

We created Dory while building a documentation platform and getting frustrated by bloated frameworks, slow build times, and cryptic deployment errors.

Dory is:

- 🧠 **Simple** — Drop in `.mdx` files and configure one `dory.json`.
- ⚡ **Fast** — Instant hot reload in dev, quick static builds for prod.
- 🌐 **Portable** — No SSR, no lock-in, deploy anywhere.
- 🧩 **Flexible** — Hackable theme, readable codebase, minimal magic.

---

## ✨ Features

- 📄 Write docs in `.mdx` (Markdown + JSX)
- 🧭 Configure site structure with a single `dory.json`
- 🧪 Built-in components for layout, navigation, and code highlighting
- 🔁 Instant hot-reload during development
- 📊 Mermaid support for diagrams and flows
- 🎨 Customizable via Tailwind and minimal theme overrides
- 🌍 Deploy to Netlify, Vercel, S3, GitHub Pages — your call
- 🌐 HTTP client for testing API endpoints (automatic inference from openapi.json)

---

## 🧑‍💻 Quick Start

Follow these steps to set up and preview the documentation locally, as well as build a static site for deployment.

### 1️⃣ Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/clidey/dory.git
cd dory
````

---

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

### 3️⃣ Copy Documentation Content

Copy your existing documentation into the `./docs` directory:

```bash
rm -rf ./docs
cp ../wherever-the-docs-are/. ./docs
```

> Replace `../wherever-the-docs-are/` with the actual path to your documentation source files.

---

### 4️⃣ Start Development Server

Start the development server to preview the documentation locally:

```bash
pnpm run dev
```

This will launch a local server (typically at `http://localhost:3000`) where you can preview and edit your documentation in real-time.

---

### 5️⃣ Build Static Site for Production

To generate a static version of the site for production deployment:

```bash
pnpm run build
```

This will create a `dist` directory containing the fully built static site, ready to be served.

---

## 🐳 Docker Deployment (Optional)

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

---

## 📂 Notes

* `pnpm run build` creates the static site inside the `dist` folder, which can be served using any static file server.
* The Docker image uses Nginx to serve the contents of the `dist` folder.


## 🔮 Roadmap

We’re actively improving Dory. Here’s what’s on deck:

* [ ] 📚 **Full Documentation** — comprehensive guides, API docs, and examples
* [ ] 🎨 **Themes** — full theming support with a flexible theme API
* [ ] 🌐 **Multi-language Support** — internationalization (i18n) & localization (l10n)
* [ ] 🚀 **GraphQL Client** — integrated GraphQL playground and client support
* [ ] 🔄 **WebSocket Client** — built-in WebSocket utilities for real-time API demos