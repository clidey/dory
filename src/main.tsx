import { render } from 'preact'
import './index.css'
import { App } from './app.tsx'
import { withMDX } from './components/mdx-provider.tsx'
import { loadFonts } from './utils/fonts'
import { NotificationProvider } from './components/notification.tsx'

// Load fonts before rendering the app
loadFonts()

const AppWithMDX = withMDX(App)

render(
    <NotificationProvider>
        <AppWithMDX />
    </NotificationProvider>,
    document.getElementById('app')!
)
