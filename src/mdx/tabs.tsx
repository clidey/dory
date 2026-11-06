import { Tabs as UxTabs, TabsContent, TabsList, TabsTrigger } from '@clidey/ux'
import { Children, isValidElement } from 'preact/compat'

/** Keyboard fallback for UX tabs rendered through Preact compatibility. */
export function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
  // Radix roving focus does not handle arrow keys through Preact compat.
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'))
  const current = tabs.indexOf(event.target as HTMLButtonElement)
  if (current < 0 || tabs.length === 0) return
  event.preventDefault()
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
    : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
  tabs[next].focus()
  tabs[next].click()
}

/** One tab panel inside <Tabs>. Renders its children when active. */
export function Tab({ children }: { title: string; children: preact.ComponentChildren }) {
  return <>{children}</>
}

/** UX tab strip for any MDX content, e.g. several diagrams of one thing. */
export function Tabs({ children }: { children: preact.ComponentChildren }) {
  const panels = Children.toArray(children).filter(isValidElement) as preact.VNode<{ title: string }>[]

  return (
    <UxTabs defaultValue="0" className="dory-tabs not-prose my-5">
      <TabsList
        className="max-w-full justify-start overflow-x-auto"
        onKeyDown={handleTabKeyDown}
      >
        {panels.map((panel, index) => (
          <TabsTrigger
            key={index}
            value={String(index)}
            className="whitespace-nowrap"
          >
            {panel.props.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {panels.map((panel, index) => (
        <TabsContent key={index} value={String(index)} className="pt-4 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
          {panel}
        </TabsContent>
      ))}
    </UxTabs>
  )
}
