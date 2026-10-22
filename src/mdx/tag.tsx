import classNames from 'classnames'

const customColorClasses = {
  emerald: 'bg-[var(--success-muted)] text-foreground border-transparent',
  sky: 'bg-accent text-[var(--primary)] border-transparent',
  amber: 'bg-transparent text-[var(--brand-readable,#B65401)] border-current',
  rose: 'bg-transparent text-red-700 dark:text-red-400 border-current',
  zinc: 'bg-transparent text-muted-foreground border-border',
  yellow: 'bg-[var(--highlight)] text-[var(--highlight-foreground)] border-transparent',
}

const methodColors: Record<string, keyof typeof customColorClasses> = {
  GET: 'sky',
  POST: 'emerald',
  PUT: 'amber',
  PATCH: 'amber',
  DELETE: 'rose',
}

export function Tag({
  children,
  variant = 'medium',
  color,
  className,
}: {
  children: string
  variant?: 'small' | 'medium'
  color?: keyof typeof customColorClasses
  className?: string
}) {
  const colorKey = color || methodColors[children] || 'zinc'

  return (
    <span
      className={classNames(
        'mr-1.5 inline-flex w-fit items-center rounded-[5px] border font-mono font-semibold align-middle',
        variant === 'small' ? 'px-1.5 py-0 text-[0.625rem]/5' : 'px-2 py-px text-[11px]/5',
        customColorClasses[colorKey],
        className,
      )}
    >
      {children}
    </span>
  )
}
