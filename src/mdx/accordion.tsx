import {
  Accordion as UXAccordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@clidey/ux'
import { Plus } from 'lucide-react'
import { Icon } from './icon'

export function AccordionGroup({ children }: { children: React.ReactNode }) {
  return (
    <UXAccordion type="single" collapsible className="dory-accordion my-5 overflow-hidden rounded-lg border border-[var(--border)] bg-muted/40">
      {children}
    </UXAccordion>
  )
}

export function Accordion({
  title,
  children,
  icon,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ComponentProps<typeof Icon>['icon']
}) {
  return (
    <AccordionItem value={title} className="border-b border-[var(--border)] last:border-b-0">
      <AccordionTrigger className="group items-center px-4 py-3 text-left hover:no-underline [&>svg:last-child]:hidden">
        <div className="flex items-center gap-3">
          {icon && <Icon icon={icon} className="h-3.5 w-3.5 !stroke-[var(--primary)] text-[var(--primary)]" />}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <Plus aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-45" />
      </AccordionTrigger>
      <AccordionContent>
        <div className="px-4 pb-3 leading-relaxed text-muted-foreground">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
