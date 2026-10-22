import classNames from "classnames";
import { Icon } from "./icon";
import type { ComponentChildren } from "preact";

export function CardGroup({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={classNames(
      'not-prose my-6 grid grid-cols-1 gap-3',
      cols === 2 && 'sm:grid-cols-2',
      cols === 3 && 'sm:grid-cols-3',
      cols === 4 && 'sm:grid-cols-4'
    )}>
      {children}
    </div>
  )
}

export function Card({
  title,
  description,
  href,
  icon,
  children,
}: {
  title?: string
  description?: string
  href?: string
  icon?: string
  children?: ComponentChildren
}) {
  return (
    <div className="dory-card group relative flex flex-col rounded-lg border border-[var(--border)] bg-card p-4 transition-shadow hover:shadow-[0_2px_10px_rgb(14_34_64/0.07)]">
      {href && <a href={href} className="absolute inset-0 z-10 rounded-lg" aria-label={title} />}
      {(icon || href) && (
        <div className="mb-3 flex items-start justify-between">
          {icon ? (
            <span className="flex size-8 items-center justify-center rounded-md bg-accent text-[var(--primary)]">
              <Icon icon={icon} className="h-4 w-4 !stroke-current" />
            </span>
          ) : <span />}
          {href && <Icon icon="ExternalLink" className="h-3.5 w-3.5 !stroke-[var(--muted-foreground)]" />}
        </div>
      )}
      <p className="font-heading text-[15px] font-semibold tracking-tight text-foreground">{title}</p>
      <div className="mt-1 text-[13px] leading-normal text-muted-foreground [&_p]:mb-0">
        {description ?? children}
      </div>
    </div>
  )
}
