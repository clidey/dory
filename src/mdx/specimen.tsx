import classNames from 'classnames'
import { Children, isValidElement } from 'preact/compat'
import { useState } from 'preact/hooks'
import { fencePropsOf } from './code'
import { Pre } from './fence'

/** Marks the props table inside a Specimen; its children render in the Props tab. */
export function SpecimenProps({ children }: { children: preact.ComponentChildren }) {
  return <>{children}</>
}

type SpecimenTab = 'Preview' | 'Code' | 'Props'

function isMdxSource(child: preact.ComponentChild): boolean {
  return isValidElement(child) && (child as preact.VNode).type === Pre && fencePropsOf(child as preact.JSX.Element).language === 'mdx'
}

function isPropsBlock(child: preact.ComponentChild): boolean {
  return isValidElement(child) && (child as preact.VNode).type === SpecimenProps
}

/**
 * Framed component example with Preview / Code / Props tabs.
 * An ```mdx fence becomes the Code tab, a <SpecimenProps> block becomes the
 * Props tab, and everything else is the rendered preview.
 */
export function Specimen({ label, children }: { label?: string; children: preact.ComponentChildren }) {
  const items = Children.toArray(children)
  const code = items.filter(isMdxSource)
  const props = items.filter(isPropsBlock)
  const preview = items.filter((child) => !isMdxSource(child) && !isPropsBlock(child))

  const tabs: SpecimenTab[] = ['Preview']
  if (code.length > 0) tabs.push('Code')
  if (props.length > 0) tabs.push('Props')

  const [active, setActive] = useState<SpecimenTab>('Preview')
  const panels: Record<SpecimenTab, preact.ComponentChildren[]> = { Preview: preview, Code: code, Props: props }

  return (
    <div className="dory-specimen not-prose my-5 overflow-hidden rounded-lg border border-[var(--border)] bg-card">
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[var(--border)] py-1.5 pl-4 pr-1.5">
        <p className="truncate font-mono text-xs text-[var(--primary)]">{label}</p>
        {tabs.length > 1 && (
          <div role="tablist" className="flex shrink-0 rounded-md bg-muted p-0.5">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active === tab}
                onClick={() => setActive(tab)}
                className={classNames('rounded-[5px] px-2.5 py-1 text-xs font-medium transition', {
                  'bg-card text-foreground shadow-[0_1px_2px_rgb(14_34_64/0.08)] dark:bg-[var(--border)]': active === tab,
                  'text-muted-foreground hover:text-foreground': active !== tab,
                })}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </div>
      <div role="tabpanel" className="p-5 [&>:first-child]:mt-0 [&>:last-child]:mb-0">
        {panels[active]}
      </div>
    </div>
  )
}
