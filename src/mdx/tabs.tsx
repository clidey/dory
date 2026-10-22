import classNames from 'classnames'
import { Children, isValidElement } from 'preact/compat'
import { useState } from 'preact/hooks'

/** One tab panel inside <Tabs>. Renders its children when active. */
export function Tab({ children }: { title: string; children: preact.ComponentChildren }) {
  return <>{children}</>
}

/** Underlined tab strip for any MDX content, e.g. several diagrams of one thing. */
export function Tabs({ children }: { children: preact.ComponentChildren }) {
  const panels = Children.toArray(children).filter(isValidElement) as preact.VNode<{ title: string }>[]
  const [active, setActive] = useState(0)

  return (
    <div className="dory-tabs not-prose my-5">
      <div role="tablist" className="flex gap-5 border-b border-[var(--border)]">
        {panels.map((panel, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={active === index}
            onClick={() => setActive(index)}
            className={classNames('-mb-px border-b-2 pb-2.5 pt-1 text-sm font-medium transition', {
              'border-[var(--primary)] text-foreground': active === index,
              'border-transparent text-muted-foreground hover:text-foreground': active !== index,
            })}
          >
            {panel.props.title}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {panels[active]}
      </div>
    </div>
  )
}
