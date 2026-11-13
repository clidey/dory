# AGENTS.md

This is the canonical agent guidance for this repository. `CLAUDE.md` intentionally points here to avoid duplicate instructions drifting apart.

## Team Rules

These apply in every clidey repository, for people and agents alike.

- **Commits:** ask once before the first commit. Once the user says yes, keep committing that work without asking again; push only when they've asked for it.
- **No AI attribution, anywhere:** commits, PRs, issues, comments and releases carry no `Co-Authored-By:` for Claude, Codex or any other agent, and no "Generated with" lines.
- **Never, whatever the instruction:** publish packages or releases, push images, deploy to UAT or production, or run anything against production. Build images and run build scripts only locally, to test. Prepare the command and hand it to the user.
- **Cluster and cloud commands:** read-only `kubectl`, `helm` and `gcloud` commands run without asking (never against production). Anything that writes, deletes or shows secret values, and anything that writes to a WhoDB organisation: show the exact command and wait for a yes.
- **Untracked files:** ask before deleting untracked or gitignored files; they often hold secrets or local state.
- **pnpm only:** never npm, npx, yarn or bun.
- **Stay in the workspace:** use only the clones in the workspace; never read or run checkouts elsewhere, such as old ones in `~/Documents`.
- **The machine:** don't keep it awake or change power settings (`caffeinate`, `pmset`); recommend it to the user instead.
- **Agent replies:** lead with the answer or result. No preamble, no restating the question, no recap unless asked. Keep it short and explain only what isn't obvious; if you need something from the user, ask in one line.
- **Clarify first:** before starting, ask about anything where a different answer would change the work: scope, behaviour, which repo or environment, or anything hard to undo. Ask all your questions at once, then wait. Don't ask what the code or docs already answer; for small choices that are easy to change later, pick one and say which in your reply.

## Project

**Dory** (`@clidey/dory`) is a static documentation site generator published on npm. Users install it and run its CLI to build MDX sites configured by `dory.json`. It is a Preact app: `react`/`react-dom` are aliased to `preact/compat` (`tsconfig.app.json`, `vite.config.ts`) so React-ecosystem libraries and `@clidey/ux` work.

## Commands

Always use pnpm (never npm or yarn) for installs.

```bash
pnpm install
pnpm run dev            # Vite dev server
pnpm run build          # build:cli + tsc -b + build:docs + build:runtime
pnpm run build:cli      # compile bin/dory.ts -> bin/dist/ (tsconfig.bin.json)
pnpm run build:docs     # vite build + SSR build (vite.config.ssr.ts) + scripts/render-routes.mjs
pnpm run build:runtime  # embedded runtime (vite.config.runtime.ts) -> dist/runtime/
pnpm run build:server   # server bundle (vite.config.server.ts)
pnpm run build:embed    # embed loader + widget (vite.config.embed-loader.ts, vite.config.embed-widget.ts)
pnpm test               # check-trigger-children + vitest run
pnpm run test:runtime-parity   # full build + scripts/verify-runtime-parity.mjs
pnpm run publish        # build + npm publish
node bin/dist/dory.js help     # CLI command list (init, dev, check, build, preview, mcp, ...), after build:cli
```

## Rules and Gotchas

- `src/mdx/processor.ts` is the single source of truth for MDX compilation settings.
- New MDX components are exported from `src/mdx/mdx.tsx`; `src/components/mdx-provider.tsx` passes that module to `MDXProvider`.
- Navigation and routes come from `docs/dory.json`; navigation changes go there.
- The CLI build (`bin/dory.ts`) stages the user's files into the package's own `docs/` directory with a verified backup and restore, then runs `build:docs`. A user project with its own top-level `docs/` directory is rejected.
- `src/components/store.ts` is plain exported mutable state, not a store library.
- Styling is Tailwind v4 through `@tailwindcss/vite` (no config file); theme CSS variables in `src/theme.scss` are set from `dory.json` colors. Check light and dark modes for UI changes.
- ux triggers: wrap interactive children in `@clidey/ux` triggers **without** `asChild` (ux >= 1.4.0 infers it for `Button`, `Badge`, and intrinsic `button`/`a`/`span`/`div`). Pass `asChild` only for non-ux elements that forward refs. Never slot a fragment, text, array, or conditional; `scripts/check-trigger-children.mjs` (deny list in `scripts/trigger-children.json`) enforces this in `pnpm test`.
- Supply-chain settings live in `pnpm-workspace.yaml` and `.npmrc`; `scripts/check-supply-chain.mjs` (Stop hook and CI) fails if one is relaxed.
- Commits use conventional prefixes: `feat(scope):`, `fix(scope):`, `chore(scope):`.

## Review Before Pushing

Before every push, show the user the code changes and, for documentation work,
a local preview. Wait for explicit approval after that review before running
`git push` or publishing/deploying documentation. Do not treat an earlier push
approval as approval for later changes.
