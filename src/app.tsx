import './app.css'
import './theme.scss'
import Routes from './components/routes'

export function App() {
  return (
    <div className="h-full antialiased">
      <div className="flex min-h-full">
        <Routes />
      </div>
    </div>
  )
}
