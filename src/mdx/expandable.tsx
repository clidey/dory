import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@clidey/ux";
import { Icon } from './icon';

export function Expandable({
  title,
  children,
  icon,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ComponentProps<typeof Icon>['icon']
}) {
  return (
    <Accordion
      type="single"
      collapsible
      className="dory-expandable my-5 rounded-lg border border-[var(--border)] bg-muted"
    >
      <AccordionItem value="expandable" className="border-b-0">
        <AccordionTrigger className="flex w-full flex-row-reverse items-center justify-end gap-2.5 px-4 py-2.5 text-left text-foreground hover:no-underline [&>svg]:-rotate-90 [&[data-state=open]>svg]:rotate-0">
          <div className="flex items-center gap-2">
            {icon && <Icon icon={icon} className="h-4 w-4" />}
            <span className="text-sm font-medium text-foreground">{title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent asChild>
          <dd className="px-4 pb-3">
            <div className="text-sm text-muted-foreground leading-relaxed [&>p]:mb-0">
              {children}
            </div>
          </dd>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
