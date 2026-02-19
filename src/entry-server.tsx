import {renderToString} from 'preact-render-to-string';
import {Router} from 'wouter-preact';
import {MDXProvider} from '@mdx-js/preact';
import * as mdxComponents from './mdx/mdx';

function pathFromFilename(filename: string): string {
  return filename
    .replace(/^.*?docs/, '')
    .replace(/\/?index\.mdx$/, '/')
    .replace(/\.mdx$/, '')
    .toLowerCase();
}

const pages = import.meta.glob('../docs/**/*.mdx');
const allPages = Object.fromEntries(
  Object.entries(pages).map(([path, loader]) => [pathFromFilename(path), loader])
);

// SSR-safe Pre: renders code blocks without syntax highlighting.
// The client-side Fence component uses useTheme() from @clidey/ux which
// requires ThemeProvider (localStorage access). Plain pre/code is sufficient
// for crawlers — syntax highlighting is a visual enhancement.
function SSRPre(props: any) {
  const child = props.children?.props;
  const className = child?.className || '';
  const code = child?.children || '';
  return (
    <pre class="overflow-x-auto p-4 text-xs">
      <code class={className}>{code}</code>
    </pre>
  );
}

// SSR-safe Latex: renders the raw expression as text.
// The client-side Latex component lazy-loads KaTeX in useEffect.
function SSRLatex({ children }: { children: any }) {
  return (
    <div class="my-4">
      <code>{children}</code>
    </div>
  );
}

// SSR-safe table: @clidey/ux's Table component renders a vaul Drawer
// (Preview drawer) alongside every table. vaul's useScaleBackground
// accesses document.body at render time, crashing in Node.js.
function SSRTable(props: any) {
  return (
    <div class="overflow-x-auto rounded-lg my-8">
      <table class="table-auto border-collapse min-w-full" {...props} />
    </div>
  );
}
function SSRTh(props: any) {
  return <th class="px-4 py-2 text-left text-sm font-medium" {...props} />;
}
function SSRTd(props: any) {
  return <td class="px-4 py-2 text-sm" {...props} />;
}

// SSR-safe placeholders for interactive components that use Suspense/lazy.
// renderToString cannot handle Suspense boundaries — these components are
// interactive-only anyway (playgrounds, diagrams) and not meaningful for crawlers.
function SSRPlaceholder() {
  return null;
}

const ssrComponents: Record<string, any> = {
  ...mdxComponents,
  pre: SSRPre,
  Latex: SSRLatex,
  table: SSRTable,
  th: SSRTh,
  td: SSRTd,
  APIPlayground: SSRPlaceholder,
  WebSocketPlayground: SSRPlaceholder,
};

export async function render(routePath: string): Promise<string> {
  const loader = allPages[routePath];
  if (!loader) return '';

  try {
    const module = await loader() as any;
    const Content = module.default;

    return renderToString(
        <Router ssrPath={routePath}>
          <MDXProvider components={ssrComponents}>
            <div class="flex w-full flex-col">
              <main class="flex grow max-w-full px-4 py-16 sm:px-6 lg:px-8">
                <div class="min-w-0 w-full">
                  <article class="h-full flex flex-1 flex-col">
                    <Content/>
                  </article>
                </div>
              </main>
            </div>
          </MDXProvider>
        </Router>
    );
  } catch (error) {
    console.warn(`SSR render failed for ${routePath}:`, error);
    return '';
  }
}
