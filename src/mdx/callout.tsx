import classNames from 'classnames'
import { Icon } from "./icon"

const icons = {
  note: 'Info',
  warning: 'AlertTriangle',
  info: 'Info',
  tip: 'Star',
  check: 'Check',
} as const

// Each type gets a distinct surface and icon badge shape so they stay distinguishable without color.
const typeStyles = {
  note: { box: 'bg-muted border-[var(--border)]', badge: 'bg-card border border-[var(--border)] text-foreground rounded-md' },
  warning: { box: 'bg-background border-[var(--highlight)]', badge: 'bg-[var(--highlight)] text-[var(--highlight-foreground)] rounded-[5px]' },
  info: { box: 'bg-accent border-transparent', badge: 'bg-[var(--primary)] text-white rounded-[5px]' },
  tip: { box: 'bg-[var(--success-muted)] border-transparent', badge: 'border border-foreground/70 text-foreground rounded-md' },
  check: { box: 'bg-background border-[var(--border)]', badge: 'bg-[var(--success-muted)] text-foreground rounded-[5px]' },
}

export function Callout({
  title,
  children,
  type = 'note',
}: {
  title: string
  children: React.ReactNode
  type?: keyof typeof icons
}) {
  const styles = typeStyles[type]
  return (
    <div role="note" className={classNames('dory-callout not-prose my-5 flex gap-3 rounded-lg border px-4 py-3 text-foreground', styles.box)}>
      <span className={classNames('mt-px flex size-6 shrink-0 items-center justify-center', styles.badge)}>
        <Icon icon={icons[type]} className="h-3 w-3 !stroke-current" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug">{title}</p>
        <div className="leading-relaxed [&_p]:mb-0">{children}</div>
      </div>
    </div>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return <Callout type="note" title="Note">{children}</Callout>
}

export function Warning({ children }: { children: React.ReactNode }) {
  return <Callout type="warning" title="Warning">{children}</Callout>
}

export function Info({ children }: { children: React.ReactNode }) {
  return <Callout type="info" title="Info">{children}</Callout>
}

export function Tip({ children }: { children: React.ReactNode }) {
  return <Callout type="tip" title="Tip">{children}</Callout>
}

export function Check({ children }: { children: React.ReactNode }) {
  return <Callout type="check" title="Check">{children}</Callout>
}
