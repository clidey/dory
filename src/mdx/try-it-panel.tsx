import { Sheet, SheetContent, SheetTitle } from '@clidey/ux'
import classNames from 'classnames'
import { ChevronsUpDown, Play, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'preact/hooks'
import type { Server } from './api-playground'
import { Fence } from './fence'
import { Tag } from './tag'

/** An editable request value: a body property, a path/query parameter, or an auth credential. */
export interface TryItField {
  name: string
  /** Short type shown beside the name, e.g. `string`, `integer`, `enum`. */
  type: string
  value: string
  /** Where a parameter goes. Body fields leave this unset. */
  in?: 'path' | 'query' | 'header'
}

interface TryItPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  method: string
  path: string
  servers: Server[]
  parameters: TryItField[]
  body: TryItField[]
  /** Auth headers, e.g. `{ name: 'Authorization', value: 'Bearer ' }`. */
  auth: TryItField[]
}

interface ResponseData {
  status: number
  statusText: string
  duration: number
  body: string
}

/** Turns a form string back into JSON for its declared type; unparseable values stay strings. */
function bodyValue(field: TryItField): unknown {
  if (field.type === 'integer' || field.type === 'number') return Number(field.value)
  if (field.type === 'boolean') return field.value === 'true'
  if (field.type === 'object' || field.type.startsWith('array')) {
    try {
      return JSON.parse(field.value)
    } catch {
      return field.value
    }
  }
  return field.value
}

function FieldInput({ field, onChange }: { field: TryItField; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline gap-2">
        <span className="font-mono text-sm font-semibold text-foreground">{field.name}</span>
        <span className="font-mono text-xs text-[var(--primary)]">{field.type}</span>
      </span>
      <input
        type="text"
        value={field.value}
        onInput={(event) => onChange((event.target as HTMLInputElement).value)}
        className="dory-tryit-input mt-1.5"
      />
    </label>
  )
}

/**
 * Right-hand "Try it" panel for a generated API page: server picker, a form
 * built from the operation's body, parameters and auth, and the live response.
 */
export function TryItPanel({ open, onOpenChange, method, path, servers, parameters, body, auth }: TryItPanelProps) {
  const [serverUrl, setServerUrl] = useState(servers[0]?.url ?? '')
  const [params, setParams] = useState(parameters)
  const [bodyFields, setBodyFields] = useState(body)
  const [authFields, setAuthFields] = useState(auth)
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([])
  const tabs = [
    bodyFields.length > 0 && 'Body',
    params.length > 0 && 'Params',
    'Headers',
    authFields.length > 0 && 'Auth',
  ].filter((tab): tab is string => Boolean(tab))
  const [tab, setTab] = useState(tabs[0])
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // A different operation (client-side navigation) starts from its own defaults.
  useEffect(() => {
    setParams(parameters)
    setBodyFields(body)
    setAuthFields(auth)
    setResponse(null)
    setError(null)
  }, [method, path])

  const update = (setter: typeof setParams, index: number, value: string) =>
    setter((fields) => fields.map((field, i) => (i === index ? { ...field, value } : field)))

  async function send() {
    setLoading(true)
    setError(null)
    setResponse(null)

    let url = `${serverUrl.replace(/\/$/, '')}${path}`
    const query = new URLSearchParams()
    const requestHeaders: Record<string, string> = {}
    for (const param of params) {
      if (param.in === 'path') url = url.replace(`{${param.name}}`, encodeURIComponent(param.value))
      else if (param.in === 'header' && param.value) requestHeaders[param.name] = param.value
      else if (param.value) query.set(param.name, param.value)
    }
    const queryString = query.toString()
    if (queryString) url += `?${queryString}`
    for (const field of authFields) if (field.value.trim()) requestHeaders[field.name] = field.value
    for (const header of headers) if (header.key.trim()) requestHeaders[header.key] = header.value

    const init: RequestInit = { method: method.toUpperCase(), headers: requestHeaders }
    const filled = bodyFields.filter((field) => field.value !== '')
    if (filled.length > 0) {
      requestHeaders['Content-Type'] = 'application/json'
      init.body = JSON.stringify(Object.fromEntries(filled.map((field) => [field.name, bodyValue(field)])))
    }

    const started = performance.now()
    try {
      const res = await fetch(url, init)
      const text = await res.text()
      let pretty = text
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        // Not JSON; show the raw text.
      }
      setResponse({ status: res.status, statusText: res.statusText, duration: Math.round(performance.now() - started), body: pretty })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="dory-tryit w-full gap-0 bg-background sm:max-w-[34rem]"
        footer={
          <div className="flex gap-3">
            <button type="button" className="dory-tryit-cancel" onClick={() => onOpenChange(false)}>Cancel</button>
            <button type="button" className="dory-tryit-send" onClick={send} disabled={loading}>
              <Play aria-hidden="true" className="h-3 w-3 fill-current" />
              {loading ? 'Sending…' : 'Send request'}
            </button>
          </div>
        }
      >
        <div className="-mx-4 -mt-4 flex items-center gap-3 border-b border-[var(--border)] px-5 py-4 pr-12">
          <Tag>{method}</Tag>
          <SheetTitle className="truncate font-mono text-base font-medium">{path}</SheetTitle>
        </div>

        <div className="space-y-6 px-1 pt-5">
          {servers.length > 0 && (
            <label className="block">
              <span className="dory-tryit-label">Server</span>
              <span className="relative mt-2 block">
                <select
                  value={serverUrl}
                  onChange={(event) => setServerUrl((event.target as HTMLSelectElement).value)}
                  className="dory-tryit-input appearance-none pr-9 font-sans"
                >
                  {servers.map((server) => (
                    <option key={server.url} value={server.url}>
                      {server.description ? `${server.description} · ${server.url}` : server.url}
                    </option>
                  ))}
                </select>
                <ChevronsUpDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </span>
            </label>
          )}

          <div>
            <div role="tablist" className="flex gap-5 border-b border-[var(--border)]">
              {tabs.map((name) => (
                <button
                  key={name}
                  type="button"
                  role="tab"
                  aria-selected={tab === name}
                  onClick={() => setTab(name)}
                  className={classNames('-mb-px border-b-2 pb-2 text-sm font-medium transition', {
                    'border-[var(--primary)] text-foreground': tab === name,
                    'border-transparent text-muted-foreground hover:text-foreground': tab !== name,
                  })}
                >
                  {name}
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-4">
              {tab === 'Body' && bodyFields.map((field, index) => (
                <FieldInput key={field.name} field={field} onChange={(value) => update(setBodyFields, index, value)} />
              ))}
              {tab === 'Params' && params.map((field, index) => (
                <FieldInput key={`${field.in}-${field.name}`} field={field} onChange={(value) => update(setParams, index, value)} />
              ))}
              {tab === 'Auth' && authFields.map((field, index) => (
                <FieldInput key={field.name} field={field} onChange={(value) => update(setAuthFields, index, value)} />
              ))}
              {tab === 'Headers' && (
                <>
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Header"
                        value={header.key}
                        onInput={(event) => setHeaders((list) => list.map((h, i) => (i === index ? { ...h, key: (event.target as HTMLInputElement).value } : h)))}
                        className="dory-tryit-input w-2/5"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={header.value}
                        onInput={(event) => setHeaders((list) => list.map((h, i) => (i === index ? { ...h, value: (event.target as HTMLInputElement).value } : h)))}
                        className="dory-tryit-input flex-1"
                      />
                      <button
                        type="button"
                        aria-label="Remove header"
                        onClick={() => setHeaders((list) => list.filter((_, i) => i !== index))}
                        className="rounded-lg px-2 text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setHeaders((list) => [...list, { key: '', value: '' }])}
                    className="flex items-center gap-1.5 text-sm font-medium text-[var(--primary)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add header
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="pb-2">
            <div className="flex items-center justify-between">
              <span className="dory-tryit-label">Response</span>
              {response && (
                <span className="flex items-center gap-2 font-mono text-xs">
                  <span className={classNames('font-semibold', response.status < 300 ? 'text-green-600' : response.status < 400 ? 'text-[var(--highlight)]' : 'text-[var(--destructive)]')}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-muted-foreground">{response.duration}ms</span>
                </span>
              )}
            </div>
            <div className="dory-tryit-response mt-2">
              {error ? (
                <p className="p-4 font-mono text-sm text-[var(--destructive)]">{error}</p>
              ) : response ? (
                <div className="overflow-x-auto p-4 font-mono text-[12.5px] leading-[1.7]">
                  <Fence language="json">{response.body}</Fence>
                </div>
              ) : (
                <p className="flex min-h-36 items-center justify-center text-sm text-muted-foreground">Send the request to see the response</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
