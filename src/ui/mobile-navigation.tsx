'use client'

import { Sheet, SheetContent, Button, ModeToggle } from '@clidey/ux'
import { createContext, Suspense, useCallback, useContext, useRef, useState } from 'react'

import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { Navigation } from '../components/navigation'
import { useIsEmbedded } from '../components/hooks'

const IsInsideMobileNavigationContext = createContext(false)

export function useIsInsideMobileNavigation() {
  return useContext(IsInsideMobileNavigationContext)
}

export function useMobileNavigation() {
  const [isOpen, setIsOpen] = useState(false)
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen(prev => !prev), [])

  return {
    isOpen,
    isOpenRef,
    open,
    close,
    toggle,
  }
}

export function MobileNavigation() {
  const isInsideMobileNavigation = useIsInsideMobileNavigation();
  const { isOpen, open, close } = useMobileNavigation();
  const ToggleIcon = isOpen ? XMarkIcon : Bars3Icon;
  const isEmbedded = useIsEmbedded();

  return (
    <IsInsideMobileNavigationContext.Provider value={true}>
      <Sheet open={isOpen} onOpenChange={(status) => {
        if (!status) {
          close();
        }
      }}>
        <Button
          variant="outline"
          size="icon"
          className="relative flex size-6 border-white/15 bg-white/5 text-white hover:bg-white/10 lg:hidden p-4"
          aria-label="Toggle navigation"
          onClick={open}
        >
          <ToggleIcon className="w-8 stroke-white" />
        </Button>
        {!isInsideMobileNavigation && (
          <Suspense fallback={null}>
            <SheetContent side="left" className="w-full sm:max-w-sm overflow-y-auto border-white/10 bg-[var(--sidebar)] p-4 pt-12 text-white">
              <Navigation />
              {
                isEmbedded &&
                <div className="flex items-center justify-end">
                  <ModeToggle data-testid="mode-toggle" />
                </div>
              }
            </SheetContent>
          </Suspense>
        )}
      </Sheet>
    </IsInsideMobileNavigationContext.Provider>
  )
}
