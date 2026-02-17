import { render } from 'preact'
import '@clidey/ux/styles.css';
import { App } from './app.tsx'
import { withMDX } from './components/mdx-provider.tsx'
import { ErrorBoundary } from './components/error-boundary.tsx'
import { loadFonts } from './utils/fonts'
import { loadColors } from './utils/colors'
import { Toaster } from '@clidey/ux'
import { ThemeProvider } from '@clidey/ux'

// Load fonts and colors before rendering the app
loadFonts()
loadColors()

const AppWithMDX = withMDX(App)

render(
    <ThemeProvider storageKey="@clidey/dory/theme">
        <Toaster />
        <ErrorBoundary>
            <AppWithMDX />
        </ErrorBoundary>
    </ThemeProvider>,
    document.getElementById('app')!
)
