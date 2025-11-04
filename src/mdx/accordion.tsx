import {
  Accordion as UXAccordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@clidey/ux'
import { Icon } from './icon'

export function AccordionGroup({ children }: { children: React.ReactNode }) {
  return (
    <UXAccordion type="single" collapsible className="my-6">
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
    <AccordionItem value={title}>
      <AccordionTrigger className="text-left">
        <div className="flex items-center gap-2">
          {icon && <Icon icon={icon} className="h-5 w-5" />}
          <span className="text-base font-semibold">{title}</span>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="text-base leading-relaxed">
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
