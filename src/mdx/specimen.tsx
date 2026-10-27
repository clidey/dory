import classNames from 'classnames'
import { Children, isValidElement } from 'preact/compat'
import { useState } from 'preact/hooks'
import { CopyButton, fencePropsOf } from './code'
import { Fence, Pre } from './fence'

/** Props tab body: a PROP / DESCRIPTION header followed by <Prop> rows. */
export function SpecimenProps({ children }: { children: preact.ComponentChildren }) {
  return (
    <div className="dory-props">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] gap-6 bg-muted px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        <span>Prop</span>
        <span>Description</span>
      </div>
      {children}
    </div>
  )
}

/** One row of a Specimen's Props tab: mono name with its type underneath, and a description. */
export function Prop({ name, type, children }: { name: string; type?: string; children: preact.ComponentChildren }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] gap-6 border-t border-[var(--border)] px-5 py-3.5">
      <div className="min-w-0">
        <p className="font-mono text-[13px] font-semibold text-foreground">{name}</p>
        {type && <p className="mt-0.5 font-mono text-xs text-[var(--primary)]">{type}</p>}
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground [&_p]:mb-0">{children}</div>
    </div>
  )
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
      <div role="tabpanel" className={classNames('[&>:first-child]:mt-0 [&>:last-child]:mb-0', { 'p-5': active === 'Preview' })}>
        {active === 'Code'
          ? code.map((child, index) => {
              // Bare source with a copy button, without the filename frame a standalone fence gets.
              const fence = fencePropsOf(child as preact.JSX.Element)
              return (
                <div key={index} className="relative px-5 py-4 font-mono text-[12.5px] leading-[1.7]">
                  <Fence language={fence.language} meta={{ ...fence.meta, title: undefined }}>{fence.code}</Fence>
                  <CopyButton code={fence.code} />
                </div>
              )
            })
          : panels[active]}
      </div>
    </div>
  )
}
