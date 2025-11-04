import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Button
} from '@clidey/ux'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import type { ComponentChildren } from 'preact'
import type { ReactNode } from 'preact/compat'

interface DropdownItem {
  icon?: ComponentChildren
  label: string
  href?: string
  onClick?: () => void
  divider?: boolean
}

interface DropdownProps {
  buttonLabel: string | ReactNode;
  items: DropdownItem[]
  className?: string
}

export default function Dropdown({ buttonLabel, items, className = '' }: DropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button className={className}>
          {buttonLabel}
          <ChevronDownIcon className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {items.map((item, index) => (
          <>
            {item.divider && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              key={index}
              onClick={item.onClick}
              className="cursor-pointer"
            >
              {item.icon && <span className="mr-2">{item.icon}</span>}
              {item.label}
            </DropdownMenuItem>
          </>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
