import { Children, isValidElement } from 'preact/compat'
import { Tabs as UxTabs, TabsList, TabsTrigger, TabsContent } from '@clidey/ux'
import { handleTabKeyDown } from './tabs'
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

function isSourceFence(child: preact.ComponentChild): boolean {
  return isValidElement(child) && (child as preact.VNode).type === Pre && ['mdx', 'tsx', 'jsx'].includes(fencePropsOf(child as preact.JSX.Element).language)
}

function isPropsBlock(child: preact.ComponentChild): boolean {
  return isValidElement(child) && (child as preact.VNode).type === SpecimenProps
}

/**
 * Framed component example with Preview / Code / Props tabs.
 * An MDX, TSX, or JSX fence becomes the Code tab, a <SpecimenProps> block becomes the
 * Props tab, and everything else is the rendered preview.
 */
export function Specimen({ label, children }: { label?: string; children: preact.ComponentChildren }) {
  const items = Children.toArray(children)
  const code = items.filter(isSourceFence)
  const props = items.filter(isPropsBlock)
  const preview = items.filter((child) => !isSourceFence(child) && !isPropsBlock(child))

  const tabs: SpecimenTab[] = ['Preview']
  if (code.length > 0) tabs.push('Code')
  if (props.length > 0) tabs.push('Props')

  const renderCode = () => code.map((child, index) => {
    const fence = fencePropsOf(child as preact.JSX.Element)
    return <div key={index} className="relative max-h-[32rem] overflow-auto px-5 py-4 font-mono text-[12.5px] leading-[1.7]">
      <Fence language={fence.language} meta={{ ...fence.meta, title: undefined }}>{fence.code}</Fence>
      <CopyButton code={fence.code} />
    </div>
  })
  if (tabs.length === 1) return <div className="dory-specimen not-prose my-5 overflow-hidden rounded-lg border border-[var(--border)] bg-card"><div className="px-4 py-3 font-mono text-xs text-[var(--primary)]">{label}</div><div className="p-5">{preview}</div></div>
  return <UxTabs defaultValue="Preview" className="dory-specimen not-prose my-5 gap-0 overflow-hidden rounded-lg border border-[var(--border)] bg-card">
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] py-2 pl-4 pr-2">
      <p className="truncate font-mono text-xs text-[var(--primary)]">{label}</p>
      <TabsList aria-label={`${label ?? 'Component'} example views`} onKeyDown={handleTabKeyDown}>
        {tabs.map(tab => <TabsTrigger key={tab} value={tab}>{tab}</TabsTrigger>)}
      </TabsList>
    </div>
    <TabsContent value="Preview" className="m-0 p-0 [&>:first-child]:mt-0 [&>:last-child]:mb-0">{preview}</TabsContent>
    {code.length > 0 && <TabsContent value="Code" className="m-0 p-0">{renderCode()}</TabsContent>}
    {props.length > 0 && <TabsContent value="Props" className="m-0 p-0">{props}</TabsContent>}
  </UxTabs>
}
