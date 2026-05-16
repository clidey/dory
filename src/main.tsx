import { render, hydrate } from 'preact'
import '@clidey/ux/styles.css';
import { App } from './app.tsx'
import { withMDX } from './components/mdx-provider.tsx'
import { ErrorBoundary } from './components/error-boundary.tsx'
import { loadFonts } from './utils/fonts'
import { loadColors } from './utils/colors'
import { loadTheme } from './utils/theme'
import { Toaster } from '@clidey/ux'
import { ThemeProvider } from '@clidey/ux'
import { preloadFrontmatter } from './components/store'
import docsConfig from '../docs/dory.json' with { type: 'json' };
import type { DoryConfig } from './types/config';

const config = docsConfig as DoryConfig;

// Start frontmatter loading immediately — if inlined from SSR, this is a no-op.
preloadFrontmatter()

// Load fonts and colors before rendering the app
loadFonts()
loadColors()
loadTheme()

const AppWithMDX = withMDX(App)

const appRoot = document.getElementById('app')!
const hasSSRContent = appRoot.children.length > 0

const defaultTheme = config.theme?.mode === 'dark' ? 'dark' : config.theme?.mode === 'light' ? 'light' : 'system';

const tree = (
    <ThemeProvider defaultTheme={defaultTheme} storageKey="@clidey/dory/theme">
        <Toaster />
        <ErrorBoundary>
            <AppWithMDX />
        </ErrorBoundary>
    </ThemeProvider>
)

// If SSR content exists, hydrate (attach JS to existing DOM).
// Otherwise, render from scratch (dev mode, non-SSR pages).
if (hasSSRContent) {
    hydrate(tree, appRoot)
} else {
    render(tree, appRoot)
}
