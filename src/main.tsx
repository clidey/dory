import { render, hydrate } from 'preact'
import '@clidey/ux/styles.css';
import { App } from './app.tsx'
import { withMDX } from './components/mdx-provider.tsx'
import { ErrorBoundary } from './components/error-boundary.tsx'
import { loadFonts } from './utils/fonts'
import { loadColors } from './utils/colors'
import { Toaster } from '@clidey/ux'
import { ThemeProvider } from '@clidey/ux'
import { preloadFrontmatter } from './components/store'

// Start frontmatter loading immediately — if inlined from SSR, this is a no-op.
preloadFrontmatter()

// Load fonts and colors before rendering the app
loadFonts()
loadColors()

const AppWithMDX = withMDX(App)

const appRoot = document.getElementById('app')!
const hasSSRContent = appRoot.children.length > 0

const tree = (
    <ThemeProvider storageKey="@clidey/dory/theme">
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
