import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import type { ComponentChildren } from 'preact'

interface DropdownItem {
  icon?: ComponentChildren
  label: string
  href?: string
  onClick?: () => void
  divider?: boolean
}

interface DropdownProps {
  buttonLabel: string
  items: DropdownItem[]
  className?: string
}

export default function Dropdown({ buttonLabel, items, className = '' }: DropdownProps) {
  return (
    <Menu as="div" className={`relative inline-block text-left ${className}`}>
      <div>
        <MenuButton className="inline-flex w-full justify-center gap-x-1.5 rounded-md bg-[#1e1e1e] px-3 py-2 text-sm font-semibold text-[#ffffff] shadow-xs ring-1 ring-[#444444] ring-inset hover:bg-[#2a2a2a]">
          {buttonLabel}
          <ChevronDownIcon aria-hidden="true" className="-mr-1 size-5 text-[#aaaaaa]" />
        </MenuButton>
      </div>

      <MenuItems
        transition
        className="absolute left-0 right-0 z-10 mt-2 w-full origin-top-right divide-y divide-[#444444] rounded-md bg-[#1e1e1e] shadow-lg ring-1 ring-[#444444]/50 transition focus:outline-hidden data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in">
        {items.map((item, index) => (
          <div key={index} className={item.divider ? 'py-1' : ''}>
            <MenuItem className="group">
              <a href={item.href} onClick={item.onClick} className="group flex items-center px-4 py-2 text-sm text-[#ffffff] data-focus:bg-[#2a2a2a] data-focus:text-[#ffffff] data-focus:outline-hidden cursor-pointer">
                {item.icon && (
                  <span className="mr-3 size-5 text-[#aaaaaa] group-data-focus:text-[#cccccc]">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </a>
            </MenuItem>
          </div>
        ))}
      </MenuItems>
    </Menu>
  )
}
