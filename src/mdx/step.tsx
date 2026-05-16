import classNames from "classnames"
import { Children } from "preact/compat"

export function Steps({ children }: { children: preact.ComponentChildren }) {
  const steps = Children.toArray(children) as preact.ComponentChildren[];
  return (
    <nav aria-label="Progress" className="py-16">
      <div className="overflow-hidden">
        {steps.map((step, stepIdx) => {
          const stepElement = Children.toArray(step)[0] as preact.JSX.Element;
          return (
            <div key={stepIdx} className={classNames(
              {
                "pb-10": stepIdx !== steps.length - 1,
                "pb-2": stepIdx === steps.length - 1,
              },
              'relative'
            )}>
              <div aria-hidden="true" className="absolute top-10 left-4 h-full w-[0.5px]" style={{ top: '40px', height: 'calc(100% - 44px)', backgroundColor: 'color-mix(in oklch, var(--brand-foreground) 30%, transparent)' }} />
              <div className="group relative flex items-start">
                <span className="flex h-9 items-center">
                  <span className="relative z-10 flex size-8 items-center justify-center rounded-full border" style={{ borderColor: 'var(--brand-foreground)', backgroundColor: 'color-mix(in oklch, var(--brand-foreground) 12%, transparent)' }}>
                    <span className="text-sm font-medium" style={{ color: 'var(--brand-foreground)' }}>
                      {stepIdx + 1}
                    </span>
                  </span>
                </span>
                <span className="ml-4 flex min-w-0 flex-col">
                  <p className="text-lg font-medium text-inherit">{stepElement.props.title}</p>
                </span>
              </div>
              <div className="ml-12 not-prose">
                {stepElement.props.children}
              </div>
            </div>
          )
        })}
      </div>
    </nav>
  )
}

export function Step({
  title: _title,
  children
}: {
  title?: string;
  children: preact.ComponentChildren
}) {
  return <p className='text-sm'>{children}</p>
}