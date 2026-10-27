// Mirrors the heading scale in theme.scss (.dory-h1 to .dory-h4). Keep both in sync.
const scale = [
  { level: 'H1', size: 48, tracking: -0.035, weight: 700 },
  { level: 'H2', size: 34, tracking: -0.03, weight: 700 },
  { level: 'H3', size: 22, tracking: -0.02, weight: 700 },
  { level: 'H4', size: 18, tracking: -0.01, weight: 600 },
]

/** Shows each heading level with its size and letter-spacing, without emitting real headings. */
export function TypeScale() {
  return (
    <div className="not-prose my-2">
      {scale.map(({ level, size, tracking, weight }) => (
        <div key={level} className="flex items-baseline gap-6 border-b border-[var(--border)] py-4 last:border-b-0">
          <span className="w-36 shrink-0 font-mono text-[11px] tracking-[0.12em] text-muted-foreground">
            {level} · {size} / {tracking}
          </span>
          <span
            className="font-heading leading-tight text-foreground"
            style={{ fontSize: `${size}px`, letterSpacing: `${tracking}em`, fontWeight: weight }}
          >
            Heading {level.slice(1)}
          </span>
        </div>
      ))}
    </div>
  )
}
