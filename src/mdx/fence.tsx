import { Fragment, Suspense, useContext } from 'preact/compat'
import { Highlight, themes } from 'prism-react-renderer'
import { Code, CodeGroup, CodeGroupContext, supportedLanguages } from './code'
import { MermaidRenderer } from './mermaid'
import { Loading } from '../components/loading'
import { useTheme } from '@clidey/ux'
import classNames from 'classnames'

function dedent(code: string): string {
  const lines = code.replace(/^\n+/, '').replace(/\s+$/, '').split('\n');
  const indents = lines.filter(l => l.trim().length > 0).map(l => l.match(/^(\s*)/)?.[1].length ?? 0);
  const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
  if (minIndent === 0) return lines.join('\n');
  return lines.map(l => l.slice(minIndent)).join('\n');
}


export function Fence({
  children,
  language,
}: {
  children: string
  language: string
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (language === 'mermaid') {
    return (
      <div className="mermaid-container">
        <Suspense fallback={<Loading />}>
          <MermaidRenderer content={children} />
        </Suspense>
      </div>
    )
  }

  const supportedLanguage = supportedLanguages[language as keyof typeof supportedLanguages] ?? language

  return (
    <Highlight
      code={dedent(children)}
      language={supportedLanguage}
      theme={isDark ? themes.vsDark : themes.vsLight}>
      {({ className, style, tokens, getTokenProps }) => (
        <pre>
          <Code className={classNames(className, "whitespace-pre-wrap")} style={{ ...style, backgroundColor: 'transparent' }} title={supportedLanguage}>
            {tokens.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {line
                  .filter((token) => !token.empty)
                  .map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token })} />
                  ))}
                {'\n'}
              </Fragment>
            ))}
          </Code>
        </pre>
      )}
    </Highlight>
  )
}
export function Pre(props: { children: { props: { className?: string; children?: string } } }) {
  const child = props.children?.props
  
  // Safely handle className that might not be a string
  const className = child?.className || ''
  const language = supportedLanguages[className.replace('language-', '') as keyof typeof supportedLanguages] ?? className.replace('language-', '')
  const code = child?.children || ''

  // Check if we're inside a CodeGroup context
  const isInCodeGroup = useContext(CodeGroupContext);

  const fence = <Fence language={language}>{code}</Fence>

  // If we're not in a CodeGroup, wrap the Fence in one
  if (!isInCodeGroup && language !== 'mermaid') {
    return <CodeGroup title={language}>{fence}</CodeGroup>
  }

  return fence
}