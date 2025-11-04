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
      className="my-6 rounded-xl border border-slate-200 dark:border-slate-700"
    >
      <AccordionItem value="expandable">
        <AccordionTrigger className="group flex w-full items-start justify-between text-left text-slate-900 dark:text-white p-6">
          <div className="flex items-center gap-2">
            {icon && <Icon icon={icon} className="h-8 w-8" />}
            <span className="text-base font-display text-slate-900 dark:text-white">{title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent asChild>
          <dd className="px-6 pb-6">
            <div className="text-sm text-slate-700 dark:text-slate-400 leading-tight [&>p]:mb-0">
              {children}
            </div>
          </dd>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}