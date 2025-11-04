import classNames from "classnames";
import {
  Card as UXCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@clidey/ux'
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
    <UXCard className="group relative">
      <a href={href} className="absolute inset-0 z-10" aria-label={title} />
      <CardHeader>
        <div className="flex items-center gap-3">
          <Icon icon={icon} className="h-8 w-8" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm leading-tight">
          {description ?? children}
        </CardDescription>
      </CardContent>
    </UXCard>
  )
}
