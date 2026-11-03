import type { ComponentChildren } from 'preact';
import { cn } from '@clidey/ux';

type DocsPageFrameProps = {
  className?: string;
  header: ComponentChildren;
  sidebar?: ComponentChildren;
  breadcrumb: ComponentChildren;
  actions?: ComponentChildren;
  title?: string;
  lead?: string;
  meta?: ComponentChildren;
  content: ComponentChildren;
  afterContent?: ComponentChildren;
  toc?: ComponentChildren;
  embedded?: boolean;
  wide?: boolean;
};

/** The page structure shared by a Dory site and its sandboxed app viewer. */
export function DocsPageFrame({ className, header, sidebar, breadcrumb, actions, title, lead, meta, content, afterContent, toc, embedded = false, wide = false }: DocsPageFrameProps) {
  return <div className={cn('dory-shell flex min-h-screen w-full flex-col bg-[var(--sidebar)]', className)}>
    {header}
    <div className="flex flex-1">
      {sidebar && <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto px-3 pb-6 pt-4">
          {sidebar}
        </div>
      </aside>}
      <main className={cn('dory-main min-w-0 flex-1 bg-background text-foreground', embedded ? 'p-8' : 'px-6 py-10 sm:px-10 lg:px-12')}>
        <div className="mx-auto flex w-full max-w-[66rem] justify-center gap-14">
          <article className={cn('dory-article flex min-w-0 flex-1 flex-col', wide ? 'max-w-[66rem]' : 'max-w-[47rem]')}>
            <div className="mb-6 flex min-h-9 flex-wrap items-center justify-between gap-4">
              {breadcrumb}
              {actions}
            </div>
            <header className="mb-10">
              {title && <h1 className="dory-page-title">{title}</h1>}
              {lead && <p className="dory-lead">{lead}</p>}
            </header>
            {meta}
            <div className="flex-1 min-h-[calc(100vh-2rem)]">{content}</div>
            {afterContent}
          </article>
          {toc}
        </div>
      </main>
    </div>
  </div>;
}
