import { render, hydrate } from 'preact'
import { Router } from 'wouter-preact'
import '@clidey/ux/styles.css';
import '@clidey/ux/brand.css';
import '@clidey/ux/theme-fonts.css';
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
import { BASE_PATH, withBase } from './utils/base-path';

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
const currentPath = window.location.pathname.replace(/\/$/, '') || '/'
const renderedPath = window.__DORY_ROUTE__ ? withBase(window.__DORY_ROUTE__).replace(/\/$/, '') || '/' : undefined
const rootPath = withBase('/').replace(/\/$/, '') || '/'
const canHydrate = hasSSRContent && (!renderedPath || currentPath === renderedPath || currentPath === rootPath)

const embedParams = new URLSearchParams(window.location.search);
const requestedTheme = embedParams.get('embedded') === 'true' ? embedParams.get('theme') : null;
const embedTheme = requestedTheme === 'dark' || requestedTheme === 'light' ? requestedTheme : null;
const defaultTheme = embedTheme ?? (config.theme?.mode === 'dark' ? 'dark' : config.theme?.mode === 'light' ? 'light' : 'system');
if (embedTheme) document.documentElement.style.colorScheme = embedTheme;

const tree = (
    <ThemeProvider defaultTheme={defaultTheme} storageKey={embedTheme ? `@clidey/dory/embed-theme-${embedTheme}` : '@clidey/dory/theme'}>
        <Toaster />
        <ErrorBoundary>
            <Router base={BASE_PATH}>
                <AppWithMDX />
            </Router>
        </ErrorBoundary>
    </ThemeProvider>
)

// If SSR content exists, hydrate (attach JS to existing DOM).
// Otherwise, render from scratch (dev mode, non-SSR pages).
if (canHydrate) {
    hydrate(tree, appRoot)
} else {
    // A static host may serve the prerendered index.html for an unknown URL.
    // Its first-page markup cannot hydrate into the 404 view.
    if (hasSSRContent) appRoot.replaceChildren()
    render(tree, appRoot)
}
