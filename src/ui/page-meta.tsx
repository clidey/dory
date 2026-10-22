type MetaValue = string | number | boolean | Date

const isoDate = /^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/

function formatValue(value: MetaValue): string {
  const date = value instanceof Date ? value : typeof value === 'string' && isoDate.test(value) ? new Date(value) : null
  if (date && !Number.isNaN(date.getTime())) {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
  return String(value)
}

/**
 * Label/value strip under the page title, from the frontmatter `meta` map:
 *
 *   meta:
 *     Edition: Community
 *     Updated: 2026-10-12
 *
 * YAML dates render as "12 Oct 2026". Renders nothing when `meta` is absent.
 */
export function PageMeta({ meta }: { meta?: Record<string, MetaValue> }) {
  if (!meta || typeof meta !== 'object') return null
  const entries = Object.entries(meta)
  if (entries.length === 0) return null

  return (
    <dl className="dory-page-meta mb-8 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-[var(--border)] py-3 sm:grid-cols-3">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-foreground">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  )
}
