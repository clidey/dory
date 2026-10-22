import { Button, Sheet, SheetContent, SheetHeader, SheetTitle } from "@clidey/ux"
import classNames from "classnames"
import { Check, ChevronRight, Copy, Play } from "lucide-react"
import { h } from "preact"
import { useState } from "preact/hooks"
import { APIPlayground, type Server } from "./api-playground"
import { CodeFrame, CodeGroup } from "./code"
import { Fence, Pre } from "./fence"
import { Tag } from "./tag"

// ---------------------------------------------------------------------------
// Field list used by the API pages and exposed to MDX as Properties/Property.
// ---------------------------------------------------------------------------

export function Properties({ children }: { children: React.ReactNode }) {
  return <div className="dory-fields not-prose my-2 divide-y divide-[var(--border)]">{children}</div>
}

/** One field: mono name, blue type, orange REQUIRED, optional default pill, muted description. */
export function Property({
  name,
  children,
  type,
  required = false,
  defaultValue,
}: {
  name: string
  children?: React.ReactNode
  type?: string
  required?: boolean
  defaultValue?: unknown
}) {
  return (
    <div className="py-3.5">
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-mono text-sm font-semibold text-foreground">{name}</span>
        {type && <span className="font-mono text-xs text-[var(--primary)]">{type}</span>}
        {required && <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-readable,#b65401)]">required</span>}
        {defaultValue !== undefined && defaultValue !== null && (
          <span className="rounded-[5px] border border-[var(--border)] bg-muted px-1.5 py-px font-mono text-[11px] text-muted-foreground">
            default: {typeof defaultValue === 'string' ? defaultValue : JSON.stringify(defaultValue)}
          </span>
        )}
      </div>
      {children && <div className="mt-1 text-sm leading-relaxed text-muted-foreground [&_p]:mb-0">{children}</div>}
    </div>
  )
}

export function ParamField({ body, type, default: defaultValue, required, children }: {
  body: string
  type: string
  default?: string | number
  required?: boolean
  children: React.ReactNode
}) {
  return <Property name={body} type={type} required={required} defaultValue={defaultValue}>{children}</Property>
}

export function ResponseField({ name, type, required, children }: {
  name: string
  type: string
  required?: boolean
  children: React.ReactNode
}) {
  return <Property name={name} type={type} required={required}>{children}</Property>
}

// ---------------------------------------------------------------------------
// OpenAPI types (the subset Dory renders)
// ---------------------------------------------------------------------------

interface Schema {
  $ref?: string
  type?: string
  format?: string
  enum?: unknown[]
  items?: Schema
  properties?: Record<string, Schema>
  required?: string[]
  description?: string
  default?: unknown
  example?: unknown
}

interface SecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  in?: 'header' | 'query' | 'cookie'
  name?: string
  scheme?: string
  description?: string
}

interface Components {
  schemas?: Record<string, Schema>
  securitySchemes?: Record<string, SecurityScheme>
}

interface Parameter {
  name: string
  in?: 'query' | 'path' | 'header' | 'cookie'
  schema?: Schema
  required?: boolean
  description?: string
}

interface MediaTypes {
  'application/json'?: { schema?: Schema; example?: unknown }
}

interface PathMethod {
  summary?: string
  description?: string
  parameters?: Parameter[]
  requestBody?: { description?: string; required?: boolean; content?: MediaTypes }
  responses: Record<string, { description?: string; content?: MediaTypes }>
  security?: Array<Record<string, string[]>>
}

export interface OpenAPIJson {
  paths: Record<string, Record<string, PathMethod | Parameter[]>>
  components: Components
  servers?: Server[]
  security?: Array<Record<string, string[]>>
}

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------

function resolveSchema(schema: Schema | undefined, components: Components): Schema {
  if (!schema) return {}
  if (schema.$ref) {
    const name = schema.$ref.replace(/^#\/components\/schemas\//, '')
    return resolveSchema(components.schemas?.[name], components)
  }
  if (schema.type === 'array' && schema.items) {
    return { ...schema, items: resolveSchema(schema.items, components) }
  }
  if (schema.properties) {
    const properties: Record<string, Schema> = {}
    for (const [key, value] of Object.entries(schema.properties)) properties[key] = resolveSchema(value, components)
    return { ...schema, properties }
  }
  return schema
}

/** Type label in the PDF style: `enum<string>`, `string · date-time`, `array<object>`. */
function typeLabel(schema: Schema): string {
  if (schema.enum) return `enum<${schema.type ?? 'string'}>`
  if (schema.type === 'array') return `array<${schema.items ? typeLabel(schema.items) : 'any'}>`
  if (schema.format) return `${schema.type ?? 'string'} · ${schema.format}`
  return schema.type ?? 'object'
}

/** Builds an example value from a schema, preferring declared examples and defaults. */
function exampleOf(schema: Schema, depth = 0): unknown {
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default
  if (schema.enum?.length) return schema.enum[0]
  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') return '2026-10-19T09:41:00Z'
      if (schema.format === 'date') return '2026-10-19'
      if (schema.format === 'uuid') return '8f2a91c4-1b7e-4c7a-9f3d-2e6b5a0c1d8e'
      if (schema.format === 'email') return 'user@example.com'
      return 'string'
    case 'integer': return 0
    case 'number': return 0
    case 'boolean': return true
    case 'array': return schema.items && depth < 4 ? [exampleOf(schema.items, depth + 1)] : []
    default: {
      if (!schema.properties || depth > 4) return {}
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(schema.properties)) out[key] = exampleOf(value, depth + 1)
      return out
    }
  }
}

function describeDefault(schema: Schema, description?: string): string | undefined {
  if (description) return description
  if (schema.description) return schema.description
  return undefined
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function SectionTitle({ children, note }: { children: string; note?: string }) {
  return (
    <div className="mt-10 mb-1">
      <h3 className="dory-h3 font-heading">{children}</h3>
      {note && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

/** Field rows for an object schema, with nested objects behind a "Show N child attributes" toggle. */
function SchemaFields({ schema, components }: { schema: Schema; components: Components }) {
  const target = schema.type === 'array' && schema.items ? schema.items : schema
  const properties = Object.entries(target.properties ?? {})
  if (properties.length === 0) return null
  return (
    <Properties>
      {properties.map(([name, raw]) => {
        const prop = resolveSchema(raw, components)
        const nested = prop.type === 'array' && prop.items?.properties ? prop.items : prop.properties ? prop : null
        return (
          <Property key={name} name={name} type={typeLabel(prop)} required={target.required?.includes(name)} defaultValue={prop.default}>
            {describeDefault(prop)}
            {nested && <ChildAttributes schema={nested} components={components} />}
          </Property>
        )
      })}
    </Properties>
  )
}

function ChildAttributes({ schema, components }: { schema: Schema; components: Components }) {
  const [open, setOpen] = useState(false)
  const count = Object.keys(schema.properties ?? {}).length
  if (count === 0) return null
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-muted px-4 py-2.5 text-left text-sm font-medium text-foreground"
      >
        <ChevronRight aria-hidden="true" className={classNames('h-3.5 w-3.5 transition-transform', { 'rotate-90': open })} />
        {open ? 'Hide' : 'Show'} {count} child attribute{count === 1 ? '' : 's'}
      </button>
      {open && <div className="pl-4"><SchemaFields schema={schema} components={components} /></div>}
    </div>
  )
}

function CopyUrl({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label="Copy URL"
      onClick={() => navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1000) })}
      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function statusTone(code: string): string {
  if (code.startsWith('2')) return 'bg-green-600'
  if (code === '401' || code === '403' || code.startsWith('5')) return 'bg-[var(--destructive)]'
  return 'bg-[var(--highlight)]'
}

/** Response examples per status code, with a colored dot per status in the tab strip. */
function ResponseTabs({ responses, components }: { responses: PathMethod['responses']; components: Components }) {
  const entries = Object.entries(responses)
  const [active, setActive] = useState(0)
  const current = entries[active]
  if (!current) return null
  const media = current[1].content?.['application/json']
  const example = media?.example ?? (media?.schema ? exampleOf(resolveSchema(media.schema, components)) : { description: current[1].description })
  const code = JSON.stringify(example, null, 2)

  return (
    <CodeFrame
      code={code}
      header={
        <div role="tablist" className="flex min-h-10 items-end gap-4 border-b border-[var(--border)] bg-muted pl-4 pr-12">
          {entries.map(([status], index) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={index === active}
              onClick={() => setActive(index)}
              className={classNames('-mb-px flex items-center gap-1.5 border-b-2 pb-2.5 pt-3 font-mono text-xs transition', {
                'border-[var(--primary)] text-foreground': index === active,
                'border-transparent text-muted-foreground hover:text-foreground': index !== active,
              })}
            >
              <span aria-hidden="true" className={classNames('size-1.5 rounded-full', statusTone(status))} />
              {status}
            </button>
          ))}
        </div>
      }
    >
      <div className="overflow-x-auto py-3 pl-4 pr-12 font-mono text-[12.5px] leading-[1.7]">
        <Fence language="json">{code}</Fence>
      </div>
    </CodeFrame>
  )
}

/** cURL / JavaScript / Python samples generated from the operation. */
function RequestSamples({ method, url, headers, body }: { method: string; url: string; headers: Record<string, string>; body?: unknown }) {
  const headerLines = Object.entries(headers)
  const json = body === undefined ? undefined : JSON.stringify(body)
  const curl = [
    `curl -X ${method} ${url} \\`,
    ...headerLines.map(([key, value]) => `  -H "${key}: ${value}" \\`),
    ...(json ? [`  -d '${json}'`] : []),
  ].join('\n').replace(/ \\$/, '')
  const js = [
    `const response = await fetch("${url}", {`,
    `  method: "${method}",`,
    `  headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')},`,
    ...(json ? [`  body: JSON.stringify(${JSON.stringify(body, null, 2).replace(/\n/g, '\n  ')}),`] : []),
    `});`,
    `const data = await response.json();`,
  ].join('\n')
  const py = [
    `import requests`,
    ``,
    `response = requests.${method.toLowerCase()}(`,
    `    "${url}",`,
    `    headers=${JSON.stringify(headers)},`,
    ...(json ? [`    json=${JSON.stringify(body)},`] : []),
    `)`,
    `print(response.json())`,
  ].join('\n')

  // Mirrors what MDX emits for a fence: <pre><code className="language-x" metastring="…">
  const sample = (title: string, language: string, code: string) => (
    <Pre key={title}>{h('code', { className: `language-${language}`, metastring: `title="${title}"` }, code)}</Pre>
  )
  return (
    <CodeGroup title="">
      {sample('cURL', 'bash', curl)}
      {sample('JavaScript', 'javascript', js)}
      {sample('Python', 'python', py)}
    </CodeGroup>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function authFields(security: Array<Record<string, string[]>> | undefined, components: Components) {
  const schemes = components.securitySchemes ?? {}
  const names = (security ?? []).flatMap((requirement) => Object.keys(requirement))
  return names.map((name) => schemes[name]).filter((scheme): scheme is SecurityScheme => Boolean(scheme))
}

function authHeader(scheme: SecurityScheme): [string, string] | null {
  if (scheme.type === 'apiKey' && scheme.in === 'header' && scheme.name) return [scheme.name, '$API_KEY']
  if (scheme.type === 'http') return ['Authorization', `${scheme.scheme === 'basic' ? 'Basic' : 'Bearer'} $TOKEN`]
  if (scheme.type === 'oauth2' || scheme.type === 'openIdConnect') return ['Authorization', 'Bearer $TOKEN']
  return null
}

export function OpenAPI({ openAPIJson, method: selectedMethod, path: selectedPath }: { openAPIJson: OpenAPIJson, method: string, path: string }) {
  const { paths, components } = openAPIJson
  const [showPlayground, setShowPlayground] = useState(false)

  const methods = paths[selectedPath]
  const operation = methods?.[selectedMethod.toLowerCase()]
  if (!operation || Array.isArray(operation)) return null

  const pathParameters = Array.isArray(methods.parameters) ? methods.parameters : []
  const parameters = [...pathParameters, ...(operation.parameters ?? [])]
  const serverUrl = (openAPIJson.servers?.[0]?.url ?? '').replace(/\/$/, '')
  const fullUrl = `${serverUrl}${selectedPath}`
  const schemes = authFields(operation.security ?? openAPIJson.security, components)
  const bodyMedia = operation.requestBody?.content?.['application/json']
  const bodySchema = bodyMedia?.schema ? resolveSchema(bodyMedia.schema, components) : undefined
  const successResponse = Object.entries(operation.responses).find(([code]) => code.startsWith('2'))?.[1]
  const responseSchema = successResponse?.content?.['application/json']?.schema
    ? resolveSchema(successResponse.content['application/json'].schema, components)
    : undefined

  const headers: Record<string, string> = {}
  for (const scheme of schemes) {
    const header = authHeader(scheme)
    if (header) headers[header[0]] = header[1]
  }
  if (bodySchema) headers['Content-Type'] = 'application/json'

  return (
    <div className="dory-api max-w-none w-full">
      <Sheet open={showPlayground} onOpenChange={setShowPlayground} modal={true}>
        <SheetContent side="bottom" className="h-[90vh] w-full overflow-y-auto p-8">
          <SheetHeader className="p-0">
            <SheetTitle>API Playground</SheetTitle>
          </SheetHeader>
          <APIPlayground method={selectedMethod} url={selectedPath} servers={openAPIJson.servers} />
        </SheetContent>
      </Sheet>

      {operation.description && <p className="dory-lead -mt-4 mb-6">{operation.description}</p>}

      <div className="not-prose flex items-center gap-3 rounded-lg border border-[var(--border)] bg-card py-2 pl-3 pr-2">
        <Tag>{selectedMethod}</Tag>
        <span className="min-w-0 flex-1 truncate font-mono text-sm">
          <span className="text-muted-foreground">{serverUrl}</span>
          <span className="font-semibold text-foreground">{selectedPath}</span>
        </span>
        <CopyUrl value={fullUrl} />
        <Button onClick={() => setShowPlayground(true)} className="flex items-center gap-1.5 bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90">
          <Play className="h-3 w-3 fill-current" />
          Try it
        </Button>
      </div>

      {schemes.length > 0 && (
        <>
          <SectionTitle>Authorization</SectionTitle>
          <Properties>
            {schemes.map((scheme, index) => {
              const header = authHeader(scheme)
              const name = header?.[0] ?? scheme.name ?? scheme.type
              const location = scheme.type === 'apiKey' ? scheme.in ?? 'header' : 'header'
              return (
                <Property key={index} name={name} type={`${location} · string`} required>
                  {scheme.description ?? (scheme.type === 'http' ? `${scheme.scheme === 'basic' ? 'Basic' : 'Bearer'} token.` : 'API key.')}
                </Property>
              )
            })}
          </Properties>
        </>
      )}

      {parameters.length > 0 && (
        <>
          <SectionTitle>Parameters</SectionTitle>
          <Properties>
            {parameters.map((param) => {
              const schema = resolveSchema(param.schema, components)
              return (
                <Property key={`${param.in}-${param.name}`} name={param.name} type={`${param.in ?? 'query'} · ${typeLabel(schema)}`} required={param.required} defaultValue={schema.default}>
                  {describeDefault(schema, param.description)}
                </Property>
              )
            })}
          </Properties>
        </>
      )}

      {bodySchema && (
        <>
          <SectionTitle note="application/json">Body</SectionTitle>
          {operation.requestBody?.description && <p className="mt-2 text-sm text-muted-foreground">{operation.requestBody.description}</p>}
          <SchemaFields schema={bodySchema} components={components} />
        </>
      )}

      {responseSchema && (
        <>
          <SectionTitle>Response</SectionTitle>
          <SchemaFields schema={responseSchema} components={components} />
        </>
      )}

      <div className="mt-8">
        <RequestSamples method={selectedMethod} url={fullUrl} headers={headers} body={bodySchema ? exampleOf(bodySchema) : undefined} />
        <ResponseTabs responses={operation.responses} components={components} />
      </div>
    </div>
  )
}
