/** Wrapping row of Chips with even gaps. */
export function ChipGroup({ children }: { children: preact.ComponentChildren }) {
  return <div className="not-prose my-4 flex flex-wrap gap-2">{children}</div>
}

/** Pill label with a brand-colored dot, for short lists such as supported databases. Links when `href` is set. */
export function Chip({ children, href }: { children: preact.ComponentChildren; href?: string }) {
  const className = 'inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-card px-3.5 py-1.5 text-[13px] font-medium text-foreground'
  const dot = <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
  if (href) {
    return <a href={href} className={`${className} hover:border-[var(--primary)]`}>{dot}{children}</a>
  }
  return <span className={className}>{dot}{children}</span>
}
