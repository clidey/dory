import classNames from "classnames"
import { Icon } from "./icon"

const styles = {
  note: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 text-sm/6 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-200 dark:[--tw-prose-links-hover:var(--color-emerald-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-emerald-900 dark:text-emerald-200',
    body: 'text-emerald-900 dark:text-emerald-200',
  },
  warning: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 text-sm/6 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-200 dark:[--tw-prose-links-hover:var(--color-emerald-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-emerald-900 dark:text-emerald-200',
    body: 'text-emerald-900 dark:text-emerald-200',
  },
  info: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 text-sm/6 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-200 dark:[--tw-prose-links-hover:var(--color-emerald-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-emerald-900 dark:text-emerald-200',
    body: 'text-emerald-900 dark:text-emerald-200',
  },
  tip: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 text-sm/6 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-200 dark:[--tw-prose-links-hover:var(--color-emerald-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-emerald-900 dark:text-emerald-200',
    body: 'text-emerald-900 dark:text-emerald-200',
  },
  check: {
    container: 'my-6 flex gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-4 text-sm/6 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/5 dark:text-emerald-200 dark:[--tw-prose-links-hover:var(--color-emerald-300)] dark:[--tw-prose-links:var(--color-white)]',
    title: 'text-emerald-900 dark:text-emerald-200',
    body: 'text-emerald-900 dark:text-emerald-200',
  },
}

const icons = {
  note: (props: { className?: string }) => <Icon icon="InformationCircleIcon" {...props} />,
  warning: (props: { className?: string }) => <Icon icon="ExclamationTriangleIcon" color="amber" {...props} />,
  info: (props: { className?: string }) => <Icon icon="InformationCircleIcon" color="blue" {...props} />,
  tip: (props: { className?: string }) => <Icon icon="LightBulbIcon" color="green" {...props} />,
  check: (props: { className?: string }) => <Icon icon="CheckCircleIcon" color="purple" {...props} />,
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
      <IconComponent className="mt-1 h-4 w-4 flex-none fill-emerald-500 stroke-white dark:fill-emerald-200/20 dark:stroke-emerald-200" />
      <div className="[&>:first-child]:mt-0 [&>:last-child]:mb-0" data-testid={title}>
        {children}
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
