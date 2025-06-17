import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react'
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Icon } from './icon'

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
    <Disclosure as="div" className="my-6 rounded-xl border border-slate-200 dark:border-slate-700">
      {({ open }) => (
        <>
          <DisclosureButton className="group flex w-full items-start justify-between text-left text-slate-900 dark:text-white p-6">
            <div className="flex items-center gap-2">
              {icon && <Icon icon={icon} className="h-8 w-8" />}
              <span className="text-base font-display text-slate-900 dark:text-white">{title}</span>
            </div>
            <span className="ml-6 flex h-7 items-center">
              {open ? (
                <MinusIcon className="h-6 w-6 text-slate-700 dark:text-slate-400" />
              ) : (
                <PlusIcon className="h-6 w-6 text-slate-700 dark:text-slate-400" />
              )}
            </span>
          </DisclosureButton>
          <DisclosurePanel as="dd" className="px-6 pb-6">
            <div className="text-sm text-slate-700 dark:text-slate-400 leading-tight [&>p]:mb-0">
              {children}
            </div>
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
}