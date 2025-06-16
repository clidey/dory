import classNames from "classnames";
import { Icon } from "./icon";
import type { ComponentChildren } from "preact";

export function CardGroup({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div className={classNames(
      'not-prose my-12 grid grid-cols-1 gap-6',
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
  title: string
  description: string
  href: string
  icon: string
  children?: ComponentChildren
}) {
  return (
    <div className="group relative rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 [background:linear-gradient(var(--quick-links-hover-bg,var(--color-sky-50)),var(--quick-links-hover-bg,var(--color-sky-50)))_padding-box,linear-gradient(to_top,var(--color-indigo-400),var(--color-cyan-400),var(--color-sky-500))_border-box] group-hover:opacity-100 dark:[--quick-links-hover-bg:var(--color-slate-800)]" />
      <div className="relative overflow-hidden rounded-xl p-6 flex gap-2 items-center">
        <Icon icon={icon} className="h-8 w-8" />
        <h2 className="mt-4 font-display text-base text-slate-900 dark:text-white">
          <a href={href}>
            <span className="absolute -inset-px rounded-xl" />
            {title}
          </a>
        </h2>
        <div className="text-sm text-slate-700 dark:text-slate-400 leading-tight [&>p]:mb-0">
          {description ?? children}
        </div>
      </div>
    </div>
  )
}
