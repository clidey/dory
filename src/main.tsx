import { render } from 'preact'
import './index.css'
import { App } from './app.tsx'
import { withMDX } from './components/mdx-provider.tsx'

const AppWithMDX = withMDX(App)

render(<AppWithMDX />, document.getElementById('app')!)
