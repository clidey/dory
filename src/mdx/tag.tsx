import { Badge } from '@clidey/ux'
import classNames from 'classnames'

const valueColorMap = {
  GET: 'default',
  POST: 'secondary',
  PUT: 'outline',
  DELETE: 'destructive',
} as const

const customColorClasses = {
  emerald: 'bg-emerald-400/10 text-emerald-500 dark:text-emerald-400 border-emerald-300 dark:border-emerald-400/30',
  sky: 'bg-sky-400/10 text-sky-500 dark:text-sky-400 border-sky-300 dark:border-sky-400/30',
  amber: 'bg-amber-400/10 text-amber-500 dark:text-amber-400 border-amber-300 dark:border-amber-400/30',
  rose: 'bg-rose-50 text-red-500 dark:bg-rose-400/10 dark:text-rose-400 border-rose-200 dark:border-rose-500/20',
  zinc: 'bg-zinc-50 text-zinc-500 dark:bg-zinc-400/10 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/20',
}

const methodColors: Record<string, keyof typeof customColorClasses> = {
  GET: 'emerald',
  POST: 'sky',
  PUT: 'amber',
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
  const badgeVariant = valueColorMap[children as keyof typeof valueColorMap] || 'outline'

  return (
    <Badge
      variant={badgeVariant}
      className={classNames(
        'font-mono text-[0.625rem]/6 font-semibold',
        customColorClasses[colorKey],
        variant === 'small' && 'px-1 py-0',
        className,
      )}
    >
      {children}
    </Badge>
  )
}
