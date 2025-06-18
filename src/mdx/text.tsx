import classNames from "classnames"
import { useState } from "preact/hooks"


export const h1 = function H1(props: preact.JSX.HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className="text-4xl font-bold mb-4 mt-12" {...props} />
}

export const h2 = function H2(props: preact.JSX.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className="text-3xl font-bold mb-3 mt-10" {...props} />
}

export const h3 = function H3(props: preact.JSX.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className="text-2xl font-bold mb-2 mt-8" {...props} />
}

export const h4 = function H4(props: preact.JSX.HTMLAttributes<HTMLHeadingElement>) {
  return <h4 className="text-xl font-bold mb-2 mt-6" {...props} />
}

export const h5 = function H5(props: preact.JSX.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className="text-lg font-bold mb-2" {...props} />
}

export const h6 = function H6(props: preact.JSX.HTMLAttributes<HTMLHeadingElement>) {
  return <h6 className="text-base font-bold mb-2" {...props} />
}

export const p = function P(props: preact.JSX.HTMLAttributes<HTMLParagraphElement>) {
  return <p className="mb-2 inline-block" {...props} />
}

export function Row({ children, cols = 1 }: { children: preact.ComponentChildren, cols?: number }) {
  return (
    <div className={`grid grid-cols-1 items-start gap-x-16 gap-y-10 xl:max-w-none`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
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
  return <a href={href} className="text-blue-500 hover:text-blue-600">{children}</a>
}

export function Image({ src, alt }: { src: string, alt: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <img 
        src={src} 
        alt={alt} 
        className="w-full h-auto cursor-pointer" 
        onClick={() => setIsExpanded(true)}
      />
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={() => setIsExpanded(false)}
        >
          <img 
            src={src} 
            alt={alt} 
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
        </div>
      )}
    </>
  );
}