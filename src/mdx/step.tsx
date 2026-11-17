import classNames from "classnames"
import { Children } from "preact/compat"

export function Steps({ children }: { children: preact.ComponentChildren }) {
  const steps = Children.toArray(children) as preact.ComponentChildren[];
  return (
    <ol aria-label="Steps" className="my-6 list-none p-0">
      {steps.map((step, stepIdx) => {
        const stepElement = Children.toArray(step)[0] as preact.JSX.Element;
        const isLast = stepIdx === steps.length - 1;
        return (
          <li key={stepIdx} className={classNames('relative flex gap-3.5', { 'pb-6': !isLast })}>
            {!isLast && <div aria-hidden="true" className="absolute left-[13.5px] top-9 bottom-1 w-px bg-[var(--border)]" />}
            <span className={classNames(
              'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-md border text-xs font-semibold',
              stepIdx === 0
                ? 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'border-[var(--border)] bg-muted text-foreground',
            )}>
              {stepIdx + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="font-heading text-[15px] font-semibold tracking-tight text-foreground">{stepElement.props.title}</p>
              <div className="not-prose mt-0.5 text-muted-foreground">
                {stepElement.props.children}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function Step({
  title: _title,
  children
}: {
  title?: string;
  children: preact.ComponentChildren
}) {
  return <p className='leading-relaxed'>{children}</p>
}
