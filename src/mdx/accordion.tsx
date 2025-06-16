import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Icon } from './icon'

export function AccordionGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 divide-y divide-slate-200 dark:divide-slate-800">
      {children}
    </div>
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
    <Disclosure as="div" className="py-4 first:pt-8 last:pb-8">
      {({ open }) => (
        <>
          <DisclosureButton className="group flex w-full items-start justify-between text-left text-slate-900 dark:text-white">
            <div className="flex items-center gap-2">
              {icon && <Icon icon={icon} className="h-5 w-5" />}
              <span className="text-base font-semibold">{title}</span>
            </div>
            <span className="ml-6 flex h-7 items-center">
              {open ? (
                <MinusIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              ) : (
                <PlusIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
              )}
            </span>
          </DisclosureButton>
          <DisclosurePanel as="dd" className="mt-2 pr-12">
            <div className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              {children}
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}
