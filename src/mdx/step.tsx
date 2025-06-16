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
              <div aria-hidden="true" className="absolute top-10 left-4 h-full w-[0.5px] bg-gray-300/50 dark:bg-gray-600/50" style={{ top: '40px', height: 'calc(100% - 44px)' }} />
              <div className="group relative flex items-start">
                <span className="flex h-9 items-center">
                  <span className="relative z-10 flex size-8 items-center justify-center rounded-full bg-white dark:bg-gray-800 group-hover:border-gray-400">
                    <span className="text-sm font-medium text-gray-500 dark:text-white">
                      {stepIdx + 1}
                    </span>
                  </span>
                </span>
                <span className="ml-4 flex min-w-0 flex-col">
                  <span className="text-lg font-medium text-inherit">
                    {stepElement.props.title}
                  </span>
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
  children 
}: { 
  children: preact.ComponentChildren 
}) {
  return <p className='text-sm'>{children}</p>
}