import { Alert, AlertTitle, AlertDescription } from '@clidey/ux'
import { Icon } from "./icon"

const typeToVariant = {
  note: 'default',
  warning: 'destructive',
  info: 'default',
  tip: 'default',
  check: 'default',
} as const

const icons = {
  note: 'InfoCircle',
  warning: 'AlertTriangle',
  info: 'InfoCircle',
  tip: 'Lightbulb',
  check: 'CheckCircle',
} as const

const typeColors = {
  note: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 *:data-[slot=alert-description]:text-inherit dark:data-[slot=alert-description]:text-inherit',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200',
  tip: 'border-green-500/30 bg-green-500/10 text-green-900 dark:text-green-200',
  check: 'border-purple-500/30 bg-purple-500/10 text-purple-900 dark:text-purple-200',
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
  return (
    <Alert variant={typeToVariant[type]} className={`my-6 ${typeColors[type]}`}>
      <Icon icon={icons[type]} className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
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
