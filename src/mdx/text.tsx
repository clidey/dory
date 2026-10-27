import { cn } from "@clidey/ux"
import { withBase } from '../utils/base-path';
import classNames from "classnames"
import { useState } from "preact/hooks"


export const h1 = function H1(props: preact.ComponentProps<'h1'>) {
  return <h1 className="dory-h1 font-heading mb-3 mt-10" {...props} />
}

export const h2 = function H2({ children, ...props }: preact.ComponentProps<'h2'>) {
  return (
    <h2 className="dory-h2 font-heading mb-4 mt-16" {...props}>
      <span>{children}</span>
      {props.id && <a href={`#${props.id}`} className="dory-anchor" aria-label="Link to this section">#</a>}
    </h2>
  )
}

export const h3 = function H3(props: preact.ComponentProps<'h3'>) {
  return <h3 className="dory-h3 font-heading mb-3 mt-10" {...props} />
}

export const h4 = function H4(props: preact.ComponentProps<'h4'>) {
  return <h4 className="dory-h4 font-heading mb-1.5 mt-5" {...props} />
}

export const h5 = function H5(props: preact.ComponentProps<'h5'>) {
  return <h5 className="text-lg font-bold mb-2" {...props} />
}

export const h6 = function H6(props: preact.ComponentProps<'h6'>) {
  return <h6 className="text-base font-bold mb-2" {...props} />
}

export const p = function P(props: preact.ComponentProps<'p'>) {
  return <p className="mb-2 inline-block" {...props} />
}

export function Row({ children, cols = 1, className }: { children: preact.ComponentChildren, cols?: number, className?: string }) {
  return (
    <div className={cn(`py-6 grid grid-cols-1 items-start gap-x-16 gap-y-10 xl:max-w-none`, className)} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {children}
    </div>
  )
}

export function Col({
  children,
  sticky = false,
  rows = 1,
  gap = 4
}: {
  children: preact.ComponentChildren
  sticky?: boolean
  rows?: number
  gap?: number
}) {
  return (
    <div
      className={classNames("[&>:first-child]:mt-0 [&>:last-child]:mb-0", {
        'xl:sticky xl:top-24': sticky,
      })}
      style={{ 
        display: 'grid',
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        gap: `${gap * 0.25}rem`
      }}
    >
      {children}
    </div>
  )
}


export function Anchor({ children, href }: { children: preact.ComponentChildren, href: string }) {
  return <a href={withBase(href)} className="text-[var(--primary)] underline decoration-[color-mix(in_oklch,var(--primary)_40%,transparent)] underline-offset-4 hover:decoration-[var(--primary)]">{children}</a>
}

export function Image({ src, alt }: { src: string, alt: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const resolvedSrc = withBase(src);

  return (
    <>
      <img 
        src={resolvedSrc} 
        alt={alt} 
        className="w-full h-auto cursor-zoom-in rounded-lg border border-[var(--border)]"
        onClick={() => setIsExpanded(true)}
      />
      {alt && <span className="mt-1.5 block text-xs text-muted-foreground">{alt}</span>}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={() => setIsExpanded(false)}
        >
          <img 
            src={resolvedSrc} 
            alt={alt} 
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </div>
      )}
    </>
  );
}