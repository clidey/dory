import classNames from 'classnames'
import { ExternalLink, File } from 'lucide-react'
import { useEffect, useState } from 'preact/hooks'
import { Fence } from './fence'

type PathRange = {
    path: string;
    range?: string;
};

type SourceProps = {
    url: string;
    branch?: string;
    paths: PathRange[];
};

type Host = 'github' | 'gitlab' | 'bitbucket' | 'other'

function hostOf(url: string): Host {
    if (url.includes('github.com')) return 'github'
    if (url.includes('gitlab.com')) return 'gitlab'
    if (url.includes('bitbucket.org')) return 'bitbucket'
    return 'other'
}

const hostNames: Record<Host, string> = { github: 'GitHub', gitlab: 'GitLab', bitbucket: 'Bitbucket', other: 'source' }

/** Browser URL for a file, with the host's line-range anchor when a range is given. */
export function sourceUrl(url: string, branch: string, path: string, range?: string): string {
    const host = hostOf(url)
    const base = host === 'github' ? `${url}/blob/${branch}/${path}`
        : host === 'gitlab' ? `${url}/-/blob/${branch}/${path}`
        : host === 'bitbucket' ? `${url}/src/${branch}/${path}`
        : url
    if (!range || host === 'other') return base
    const [start, end] = range.split('-')
    if (host === 'bitbucket') return `${base}#lines-${start}${end ? `:${end}` : ''}`
    return `${base}#L${start}${end ? `-L${end}` : ''}`
}

/** Raw file URL used to fetch the excerpt, or null when the host has no raw endpoint. */
export function rawUrl(url: string, branch: string, path: string): string | null {
    const host = hostOf(url)
    const repo = url.replace(/\/+$/, '').split('/').slice(-2).join('/')
    if (host === 'github') return `https://raw.githubusercontent.com/${repo}/${branch}/${path}`
    if (host === 'gitlab') return `${url}/-/raw/${branch}/${path}`
    if (host === 'bitbucket') return `${url}/raw/${branch}/${path}`
    return null
}

const languages: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', mjs: 'javascript', json: 'json', go: 'go', py: 'python',
    rs: 'rust', java: 'java', rb: 'ruby', php: 'php', sh: 'bash', yml: 'yaml', yaml: 'yaml', toml: 'toml', md: 'markdown',
    mdx: 'markdown', css: 'css', scss: 'css', html: 'html', sql: 'sql', graphql: 'graphql',
}

function languageOf(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    return languages[ext] ?? 'markup'
}

const previewLines = 30

/** Lines for the given range, or the first 30 lines (with the total) when no range is set. */
function sliceRange(text: string, range?: string): { code: string; startLine: number; total: number } {
    const lines = text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')
    if (!range) return { code: lines.slice(0, previewLines).join('\n'), startLine: 1, total: lines.length }
    const [start, end] = range.split('-').map((n) => parseInt(n, 10))
    const from = Math.max(1, start || 1)
    const to = end || from
    return { code: lines.slice(from - 1, to).join('\n'), startLine: from, total: lines.length }
}

/**
 * Links to files in a repository and previews the referenced lines inline.
 * Each path is a chip; the selected chip's excerpt is fetched from the host's
 * raw endpoint and shown with line numbers. When the fetch fails, the frame
 * keeps the link to open the file on the host.
 */
export const Source = ({ url, branch = "main", paths }: SourceProps) => {
    const [selected, setSelected] = useState(0)
    const [excerpt, setExcerpt] = useState<{ key: string; code: string; startLine: number; total: number } | null>(null)
    const [failed, setFailed] = useState(false)

    const host = hostOf(url)
    const repo = url.replace(/\/+$/, '').split('/').slice(-2).join('/')
    const current = paths[selected] ?? paths[0]
    const key = `${current?.path}@${current?.range ?? ''}`

    useEffect(() => {
        if (!current) return
        const raw = rawUrl(url, branch, current.path)
        setFailed(false)
        if (!raw) { setFailed(true); return }
        let cancelled = false
        fetch(raw)
            .then((response) => (response.ok ? response.text() : Promise.reject(new Error(String(response.status)))))
            .then((text) => { if (!cancelled) setExcerpt({ key, ...sliceRange(text, current.range) }) })
            .catch(() => { if (!cancelled) setFailed(true) })
        return () => { cancelled = true }
    }, [url, branch, key])

    if (!current) return null
    const openLabel = `Open on ${hostNames[host]}`
    const ready = excerpt?.key === key

    return (
        <div className="dory-source not-prose my-5">
            <p className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Sources</p>
            <div className="flex flex-wrap gap-2">
                {paths.map(({ path, range }, index) => (
                    <button
                        key={path + (range || '')}
                        type="button"
                        onClick={() => setSelected(index)}
                        aria-pressed={index === selected}
                        className={classNames(
                            'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-xs transition',
                            index === selected
                                ? 'border-[var(--primary)] bg-accent text-foreground'
                                : 'border-[var(--border)] bg-muted text-foreground hover:border-[var(--primary)]',
                        )}
                    >
                        <File aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                        {path}
                        {range && <span className="text-muted-foreground">{range}</span>}
                    </button>
                ))}
            </div>
            <div className="dory-code mt-3 overflow-hidden rounded-lg border border-[var(--border)] bg-card">
                <div className="flex min-h-10 items-center gap-2 border-b border-[var(--border)] bg-muted px-4">
                    <File aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <p className="mr-auto truncate font-mono text-xs text-foreground">
                        {repo} · {current.path}
                        {current.range && <span className="ml-2 text-muted-foreground">{current.range}</span>}
                    </p>
                    <a
                        href={sourceUrl(url, branch, current.path, current.range)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
                    >
                        {openLabel}
                        <ExternalLink aria-hidden="true" className="h-3 w-3" />
                    </a>
                </div>
                {ready ? (
                    <>
                        <div className="overflow-x-auto py-3 pl-4 pr-12 font-mono text-[12.5px] leading-[1.7]">
                            <Fence language={languageOf(current.path)} startLine={excerpt.startLine}>{excerpt.code}</Fence>
                        </div>
                        {!current.range && excerpt.total > previewLines && (
                            <p className="border-t border-[var(--border)] px-4 py-2 font-mono text-[11px] text-muted-foreground">
                                Showing lines 1–{previewLines} of {excerpt.total}
                            </p>
                        )}
                    </>
                ) : (
                    <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                        {failed ? `Preview unavailable. ${openLabel} to read the file.` : 'Loading excerpt…'}
                    </p>
                )}
            </div>
        </div>
    );
};
