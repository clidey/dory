import docsConfig from '../../docs/dory.json' with { type: 'json' }
import type { DoryConfig } from '../types/config'
import { DORY_REPO_URL, DoryMark } from './dory-mark'

const config = docsConfig as DoryConfig

/** Article footer: "Powered by Dory" and the copyright line. */
export function PageFooter() {
  return (
    <footer className="dory-page-footer mt-12 flex items-center justify-between pb-4">
      <a href={DORY_REPO_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
        <DoryMark className="h-3.5 w-3.5" />
        Powered by Dory
      </a>
      <span>© {new Date().getFullYear()} {config.copyright ?? config.name}</span>
    </footer>
  )
}
