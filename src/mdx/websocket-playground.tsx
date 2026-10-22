import classNames from 'classnames'
import { ChevronsUpDown, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { Tag } from './tag'

export interface WebSocketServer {
  url: string;
  description?: string;
  protocol?: string;
}

interface WebSocketPlaygroundProps {
  url: string
  title?: string
  description?: string
  subprotocols?: string[]
  headers?: Record<string, string>
  servers?: WebSocketServer[]
  authType?: 'bearer' | 'apiKey' | 'basic' | 'none'
}

interface WebSocketConfig {
  url: string
  headers: Record<string, string>
  subprotocols: string[]
}

interface WebSocketMessage {
  id: string
  type: 'sent' | 'received' | 'error' | 'system'
  data: string
  timestamp: number
  binary?: boolean
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

const inputClass = 'min-w-0 flex-1 rounded-md border border-[var(--border)] bg-muted px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-[var(--primary)] focus:outline-none'
const labelClass = 'font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground'

function MonoLabel({ children }: { children: string }) {
  return <p className={labelClass}>{children}</p>
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
      <X className="h-3.5 w-3.5" />
    </button>
  )
}

function AddLink({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className="mt-1 w-fit text-sm font-medium text-[var(--primary)] hover:underline">
      + {children}
    </button>
  )
}

interface KeyValue { key: string; value: string }

/** Key/value rows for request headers. Changes are pushed into the connection config. */
export function HeadersTab({ headers, onChange }: { headers: Record<string, string>; onChange: (headers: Record<string, string>) => void }) {
  const [rows, setRows] = useState<KeyValue[]>(() => Object.entries(headers).map(([key, value]) => ({ key, value })))

  const update = (next: KeyValue[]) => {
    setRows(next)
    const out: Record<string, string> = {}
    for (const row of next) if (row.key.trim()) out[row.key.trim()] = row.value
    onChange(out)
  }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, index) => (
        <div key={index} className="flex items-center gap-2">
          <input className={inputClass} value={row.key} placeholder="Header" aria-label="Header name"
            onInput={(e) => update(rows.map((r, i) => i === index ? { ...r, key: (e.target as HTMLInputElement).value } : r))} />
          <input className={inputClass} value={row.value} placeholder="Value" aria-label="Header value"
            onInput={(e) => update(rows.map((r, i) => i === index ? { ...r, value: (e.target as HTMLInputElement).value } : r))} />
          <RemoveButton label="Remove header" onClick={() => update(rows.filter((_, i) => i !== index))} />
        </div>
      ))}
      <AddLink onClick={() => update([...rows, { key: '', value: '' }])}>Add header</AddLink>
    </div>
  )
}

/** Editable list of subprotocols offered during the handshake. */
export function SubprotocolsTab({ subprotocols, onChange }: { subprotocols: string[]; onChange: (subprotocols: string[]) => void }) {
  const [rows, setRows] = useState<string[]>(subprotocols)
  const update = (next: string[]) => { setRows(next); onChange(next.map((s) => s.trim()).filter(Boolean)) }

  return (
    <div className="flex flex-col gap-2">
      {rows.map((value, index) => (
        <div key={index} className="flex items-center gap-2">
          <input className={inputClass} value={value} placeholder="Subprotocol" aria-label="Subprotocol"
            onInput={(e) => update(rows.map((r, i) => i === index ? (e.target as HTMLInputElement).value : r))} />
          <RemoveButton label="Remove subprotocol" onClick={() => update(rows.filter((_, i) => i !== index))} />
        </div>
      ))}
      <AddLink onClick={() => update([...rows, ''])}>Add subprotocol</AddLink>
    </div>
  )
}

interface AuthState { type: 'none' | 'bearer' | 'apiKey' | 'basic'; token: string; apiKey: string; username: string; password: string }

function Select({ value, onChange, children, label }: { value: string; onChange: (value: string) => void; children: preact.ComponentChildren; label: string }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange((e.target as HTMLSelectElement).value)}
        className="w-full appearance-none rounded-md border border-[var(--border)] bg-card py-2 pl-3 pr-9 text-sm text-foreground focus:border-[var(--primary)] focus:outline-none"
      >
        {children}
      </select>
      <ChevronsUpDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function AuthTab({ auth, setAuth }: { auth: AuthState; setAuth: (auth: AuthState) => void }) {
  const field = (key: keyof AuthState, placeholder: string, type = 'text') => (
    <input className={inputClass} type={type} value={auth[key] as string} placeholder={placeholder} aria-label={placeholder}
      onInput={(e) => setAuth({ ...auth, [key]: (e.target as HTMLInputElement).value })} />
  )
  return (
    <div className="flex flex-col gap-3">
      <Select label="Authentication type" value={auth.type} onChange={(type) => setAuth({ ...auth, type: type as AuthState['type'] })}>
        <option value="none">No authentication</option>
        <option value="bearer">Bearer token</option>
        <option value="apiKey">API key</option>
        <option value="basic">Basic auth</option>
      </Select>
      {auth.type === 'bearer' && <div className="flex">{field('token', 'Bearer token', 'password')}</div>}
      {auth.type === 'apiKey' && <div className="flex">{field('apiKey', 'API key', 'password')}</div>}
      {auth.type === 'basic' && <div className="flex gap-2">{field('username', 'Username')}{field('password', 'Password', 'password')}</div>}
    </div>
  )
}

const statusDot: Record<ConnectionState, string> = {
  connected: 'bg-green-600',
  connecting: 'bg-[var(--highlight)]',
  error: 'bg-[var(--destructive)]',
  disconnected: 'bg-muted-foreground',
}

const statusText: Record<ConnectionState, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  error: 'Error',
  disconnected: 'Disconnected',
}

/**
 * Inline WebSocket client: connection bar, server picker, Headers/Subprotocols/Auth
 * tabs, message log and composer. Browsers cannot send custom headers on a
 * WebSocket handshake, so headers and auth are kept for documentation and for
 * servers that read them from the first message.
 */
export function WebSocketPanel({
  url,
  title,
  subprotocols: defaultSubprotocols = [],
  headers: defaultHeaders = {},
  servers = [],
  authType = 'none',
}: WebSocketPlaygroundProps) {
  const [tab, setTab] = useState<'headers' | 'subprotocols' | 'auth'>('headers')
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [serverIndex, setServerIndex] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const messageIdRef = useRef(0)
  const [wsConfig, setWsConfig] = useState<WebSocketConfig>({
    url: (servers[0]?.url ?? '') + url,
    headers: { ...defaultHeaders },
    subprotocols: [...defaultSubprotocols],
  })
  const [auth, setAuth] = useState<AuthState>({ type: authType, token: '', apiKey: '', username: '', password: '' })

  useEffect(() => {
    const server = servers[serverIndex]
    if (server) setWsConfig((prev) => ({ ...prev, url: server.url + url }))
  }, [serverIndex, url])

  useEffect(() => () => wsRef.current?.close(), [])

  const addMessage = useCallback((type: WebSocketMessage['type'], data: string, binary = false) => {
    setMessages((prev) => [...prev, { id: String(++messageIdRef.current), type, data, timestamp: Date.now(), binary }])
  }, [])

  const connect = useCallback(() => {
    wsRef.current?.close()
    setConnectionState('connecting')
    setError(null)
    try {
      const ws = new WebSocket(wsConfig.url, wsConfig.subprotocols)
      ws.onopen = () => { setConnectionState('connected'); addMessage('system', `Connected to ${wsConfig.url}`) }
      ws.onmessage = (event) => {
        const isBinary = event.data instanceof ArrayBuffer || event.data instanceof Blob
        const size = event.data instanceof Blob ? event.data.size : event.data instanceof ArrayBuffer ? event.data.byteLength : 0
        addMessage('received', isBinary ? `[Binary data: ${size} bytes]` : String(event.data), isBinary)
      }
      ws.onerror = () => { setConnectionState('error'); setError('WebSocket connection error'); addMessage('error', 'Connection error') }
      ws.onclose = (event) => { setConnectionState('disconnected'); addMessage('system', `Disconnected: ${event.reason || 'connection closed'} (code ${event.code})`) }
      wsRef.current = ws
    } catch (err) {
      setConnectionState('error')
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }, [wsConfig, addMessage])

  const disconnect = useCallback(() => { wsRef.current?.close(); wsRef.current = null }, [])

  const send = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageInput.trim()) {
      wsRef.current.send(messageInput)
      addMessage('sent', messageInput)
      setMessageInput('')
    }
  }, [messageInput, addMessage])

  const connected = connectionState === 'connected'
  const tabs: Array<[typeof tab, string]> = [['headers', 'Headers'], ['subprotocols', 'Subprotocols'], ['auth', 'Auth']]

  return (
    <div className="dory-ws not-prose my-5 overflow-hidden rounded-lg border border-[var(--border)] bg-card">
      <div className="flex items-center gap-3 border-b border-[var(--border)] py-2 pl-3 pr-2">
        <Tag color="sky">WS</Tag>
        <span className="font-mono text-sm font-semibold text-foreground">{title || url}</span>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span aria-hidden="true" className={classNames('size-1.5 rounded-full', statusDot[connectionState])} />
          {statusText[connectionState]}
        </span>
        <button
          type="button"
          onClick={connected ? disconnect : connect}
          disabled={connectionState === 'connecting'}
          className={classNames('ml-auto rounded-md px-4 py-1.5 text-sm font-semibold transition disabled:opacity-60', {
            'bg-[var(--primary)] text-white hover:opacity-90': !connected,
            'border border-[var(--border)] bg-muted text-foreground hover:bg-card': connected,
          })}
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-5">
        {servers.length > 0 && (
          <div className="flex flex-col gap-2">
            <MonoLabel>Server</MonoLabel>
            <Select label="Server" value={String(serverIndex)} onChange={(v) => setServerIndex(Number(v))}>
              {servers.map((server, index) => (
                <option key={server.url} value={index}>{server.description ? `${server.description} · ${server.url}` : server.url}</option>
              ))}
            </Select>
          </div>
        )}

        <div>
          <div role="tablist" className="flex gap-5 border-b border-[var(--border)]">
            {tabs.map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={classNames('-mb-px border-b-2 pb-2.5 pt-1 text-sm font-medium transition', {
                  'border-[var(--primary)] text-foreground': tab === key,
                  'border-transparent text-muted-foreground hover:text-foreground': tab !== key,
                })}>
                {label}
              </button>
            ))}
          </div>
          <div className="pt-4">
            {tab === 'headers' && <HeadersTab headers={wsConfig.headers} onChange={(headers) => setWsConfig((prev) => ({ ...prev, headers }))} />}
            {tab === 'subprotocols' && <SubprotocolsTab subprotocols={wsConfig.subprotocols} onChange={(subprotocols) => setWsConfig((prev) => ({ ...prev, subprotocols }))} />}
            {tab === 'auth' && <AuthTab auth={auth} setAuth={setAuth} />}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-2.5">
        <MonoLabel>Messages</MonoLabel>
        <button type="button" onClick={() => setMessages([])} className="text-sm text-muted-foreground hover:text-foreground">Clear</button>
      </div>
      <div className="max-h-72 min-h-56 overflow-y-auto border-t border-[var(--border)] bg-background px-4 py-3">
        {messages.length === 0 ? (
          <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">Connect to start receiving messages</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {messages.map((message) => (
              <li key={message.id} className="flex items-baseline gap-3 font-mono text-xs">
                <span className={classNames('w-10 shrink-0 font-semibold uppercase tracking-[0.08em]', {
                  'text-[var(--brand-readable,#b65401)]': message.type === 'sent',
                  'text-[var(--primary)]': message.type === 'received',
                  'text-[var(--destructive)]': message.type === 'error',
                  'text-muted-foreground': message.type === 'system',
                })}>
                  {message.type === 'sent' ? 'send' : message.type === 'received' ? 'recv' : message.type === 'error' ? 'err' : 'sys'}
                </span>
                <span className="min-w-0 flex-1 break-words text-foreground">{message.data}</span>
                <span className="shrink-0 text-muted-foreground">{new Date(message.timestamp).toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-2 font-mono text-xs text-[var(--destructive)]">{error}</p>}
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--border)] bg-muted px-4 py-3">
        <input
          className={classNames(inputClass, 'bg-card')}
          value={messageInput}
          onInput={(e) => setMessageInput((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send() }}
          placeholder={'{"type":"query.start","sql":"select * from orders limit 3"}'}
          aria-label="Message to send"
        />
        <button type="button" onClick={send} disabled={!connected || !messageInput.trim()}
          className="rounded-md border border-[var(--border)] bg-card px-4 py-2 text-sm font-semibold text-foreground transition disabled:text-muted-foreground disabled:opacity-70">
          Send
        </button>
      </div>
    </div>
  )
}

/** MDX component: optional description, then the inline WebSocket panel. */
export function WebSocketPlayground(props: WebSocketPlaygroundProps) {
  if (typeof window === 'undefined') return null
  return (
    <div className="my-5">
      {props.description && <p className="mb-3 text-sm text-muted-foreground">{props.description}</p>}
      <WebSocketPanel {...props} />
    </div>
  )
}
