import { useNotification } from '../components/notification'
import { Icon } from './icon'

/** Grid of icon tiles. Clicking a tile copies its `<Icon icon="…" />` tag. */
export function IconGrid({ icons, cols = 4 }: { icons: string[]; cols?: number }) {
  const { showNotification } = useNotification()

  const copy = (name: string) => {
    const tag = `<Icon icon="${name}" />`
    navigator.clipboard.writeText(tag).then(() => showNotification(`Copied ${tag}`))
  }

  return (
    <div className="not-prose my-2 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {icons.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => copy(name)}
          title={`Copy <Icon icon="${name}" />`}
          className="flex flex-col items-center gap-2.5 rounded-lg border border-[var(--border)] bg-muted/50 px-3 py-4 text-foreground transition hover:border-[var(--primary)] hover:bg-card"
        >
          <Icon icon={name} className="h-5 w-5 !stroke-current" />
          <span className="font-mono text-[11px] text-muted-foreground">{name}</span>
        </button>
      ))}
    </div>
  )
}
