/** Mono "Docs / Group / Page" trail above the page title. */
export function Breadcrumb({ group, title }: { group?: string; title?: string }) {
  const parts = ['Docs', group, title].filter((part): part is string => Boolean(part))

  return (
    <nav aria-label="Breadcrumb" className="dory-breadcrumb">
      <ol className="flex flex-wrap items-center gap-2">
        {parts.map((part, index) => (
          <li key={index} className="flex items-center gap-2 whitespace-nowrap" aria-current={index === parts.length - 1 ? 'page' : undefined}>
            {index > 0 && <span aria-hidden="true">/</span>}
            <span>{part}</span>
          </li>
        ))}
      </ol>
    </nav>
  )
}
