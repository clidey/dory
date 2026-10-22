/**
 * Options parsed from a code fence's meta string, e.g.
 * ```json dory.json {4-6}  or  ```bash tag="GET" label="/api/users"
 */
export interface FenceMeta {
  title?: string
  tag?: string
  label?: string
  highlight: Set<number>
}

const shellLanguages = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'terminal'])

/**
 * Parses a fence meta string. `key="value"` pairs set title/tag/label,
 * `{1,4-6}` lists highlighted lines, and any remaining text is the title.
 */
export function parseFenceMeta(meta?: string): FenceMeta {
  const result: FenceMeta = { highlight: new Set() }
  if (!meta) return result

  let rest = meta.replace(/(\w+)="([^"]*)"/g, (_, key: string, value: string) => {
    if (key === 'title' || key === 'tag' || key === 'label') result[key] = value
    return ''
  })

  rest = rest.replace(/\{([\d,\s-]+)\}/g, (_, ranges: string) => {
    for (const part of ranges.split(',')) {
      const [start, end] = part.split('-').map((n) => parseInt(n.trim(), 10))
      if (Number.isNaN(start)) continue
      for (let line = start; line <= (Number.isNaN(end) || end === undefined ? start : end); line++) {
        result.highlight.add(line)
      }
    }
    return ''
  })

  const title = rest.trim()
  if (title && !result.title) result.title = title
  return result
}

/** Returns true for languages whose `$ ` lines render as a terminal session. */
function isShellLanguage(language: string): boolean {
  return shellLanguages.has(language.toLowerCase())
}

/** True when a shell fence reads as a terminal session (has `$ ` prompts). */
export function isTerminalSession(language: string, code: string): boolean {
  return isShellLanguage(language) && code.split('\n').some((line) => line.trimStart().startsWith('$ '))
}

/**
 * Returns the language to highlight a diff's lines with: `diff` gives '' (plain),
 * `diff-json` gives 'json'. Returns null when the fence is not a diff.
 */
export function diffBaseLanguage(language: string): string | null {
  if (language === 'diff') return ''
  if (language.startsWith('diff-')) return language.slice('diff-'.length)
  return null
}
