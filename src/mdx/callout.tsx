import classNames from "classnames"
import { Icon } from "./icon"

const styles = {
  note: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 text-sm/6 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-200 dark:[--tw-prose-links-hover:var(--color-emerald-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-emerald-900 dark:text-emerald-200',
    body: 'text-emerald-900 dark:text-emerald-200',
  },
  warning: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-amber-500/20 bg-amber-50/50 p-4 text-sm/6 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-200 dark:[--tw-prose-links-hover:var(--color-amber-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-amber-900 dark:text-amber-200',
    body: 'text-amber-900 dark:text-amber-200',
  },
  info: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-50/50 p-4 text-sm/6 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/5 dark:text-blue-200 dark:[--tw-prose-links-hover:var(--color-blue-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-blue-900 dark:text-blue-200',
    body: 'text-blue-900 dark:text-blue-200',
  },
  tip: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-green-500/20 bg-green-50/50 p-4 text-sm/6 text-green-900 dark:border-green-500/30 dark:bg-green-500/5 dark:text-green-200 dark:[--tw-prose-links-hover:var(--color-green-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-green-900 dark:text-green-200',
    body: 'text-green-900 dark:text-green-200',
  },
  check: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-purple-500/20 bg-purple-50/50 p-4 text-sm/6 text-purple-900 dark:border-purple-500/30 dark:bg-purple-500/5 dark:text-purple-200 dark:[--tw-prose-links-hover:var(--color-purple-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-purple-900 dark:text-purple-200',
    body: 'text-purple-900 dark:text-purple-200',
  },
}

const icons = {
  note: (props: { className?: string }) => <Icon icon="InfoCircle" {...props} />,
  warning: (props: { className?: string }) => <Icon icon="AlertTriangle" {...props} />,
  info: (props: { className?: string }) => <Icon icon="InfoCircle" {...props} />,
  tip: (props: { className?: string }) => <Icon icon="Lightbulb" {...props} />,
  check: (props: { className?: string }) => <Icon icon="CheckCircle" {...props} />,
}

export function Callout({
  title,
  children,
  type = 'note',
}: {
  title: string
  children: React.ReactNode
  type?: keyof typeof styles
}) {
  const IconComponent = icons[type]

  return (
    <div className={classNames(styles[type].container)}>
      <IconComponent className="mt-1 h-4 w-4 flex-none" />
      <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0">
        <div className={styles[type].title}>{title}</div>
        <div className={styles[type].body}>{children}</div>
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
