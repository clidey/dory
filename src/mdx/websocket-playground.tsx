import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import { PencilIcon, TrashIcon, XIcon, PlusIcon, MessageCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import Dropdown from '../components/dropdown'
import { Tag } from './tag'
import { PlayButton } from './api-playground'
import { Badge, Button, Card, EmptyState, Sheet, SheetContent, SheetHeader, SheetTitle, Input } from '@clidey/ux'

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

export function DisconnectButton(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
      />
    </svg>
  )
}

function LoadingSpinner(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="animate-spin" {...props}>
      <path
        fill="currentColor"
        d="M10 2a8 8 0 0 1 8 8c0 .3-.02.59-.06.88l-1.99-.22A6 6 0 1 0 4 10c0-.34.03-.67.09-1L2.1 8.78A8 8 0 0 1 10 2Z"
      />
    </svg>
  )
}

interface WebSocketConfig {
  headers: Record<string, string>
  subprotocols: string[]
}

interface HeadersTabProps {
  wsConfig: WebSocketConfig
  setWsConfig: React.Dispatch<React.SetStateAction<WebSocketConfig>>
}

interface HeaderItem {
  key: string
  value: string
  isEditing: boolean
  isNew?: boolean
}

export const HeadersTab = ({ wsConfig, setWsConfig }: HeadersTabProps) => {
  const [headersList, setHeadersList] = useState<HeaderItem[]>([])
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!hasInitialized.current) {
      const initialHeaders = Object.entries(wsConfig.headers ?? {}).map(([key, value]) => ({
        key,
        value,
        isEditing: false
      }))
      setHeadersList(initialHeaders)
      hasInitialized.current = true
    }
  }, [wsConfig.headers])

  useEffect(() => {
    const newHeaders: Record<string, string> = {}
    headersList.forEach(h => {
      if (h.key.trim()) newHeaders[h.key] = h.value
    })
    setWsConfig(prev => ({ ...prev, headers: newHeaders }))
  }, [headersList, setWsConfig])

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    setHeadersList(list =>
      list.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    )
  }

  const saveHeader = (index: number) => {
    setHeadersList(list =>
      list.map((h, i) => (i === index ? { ...h, isEditing: false, isNew: false } : h))
    )
  }

  const cancelEdit = (index: number) => {
    setHeadersList(list =>
      list.reduce<HeaderItem[]>((acc, h, i) => {
        if (i === index) {
          if (h.isNew) return acc // remove new row if cancelled
          return [...acc, { ...h, isEditing: false }]
        }
        return [...acc, h]
      }, [])
    )
  }

  const editHeader = (index: number) => {
    setHeadersList(list =>
      list.map((h, i) => (i === index ? { ...h, isEditing: true } : h))
    )
  }

  const removeHeader = (index: number) => {
    setHeadersList(list => list.filter((_, i) => i !== index))
  }

  const addEmptyHeaderRow = () => {
    setHeadersList(list => [
      ...list,
      { key: '', value: '', isEditing: true, isNew: true }
    ])
  }

  return (
    <div className="flex flex-col gap-2 px-2 py-4">
      <div className="flex items-center gap-2 px-2">
        <span className="text-sm font-medium text-zinc-400 w-32">Key</span>
        <span className="text-sm font-medium text-zinc-400 flex-1">Value</span>
      </div>
      {headersList.map((hdr, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {hdr.isEditing ? (
            <>
              <Input
                type="text"
                value={hdr.key}
                onChange={e => updateHeader(idx, 'key', (e.target as HTMLInputElement).value)}
                placeholder="Header name"
                className="w-32 text-sm"
              />
              <Input
                type="text"
                value={hdr.value}
                onChange={e => updateHeader(idx, 'value', (e.target as HTMLInputElement).value)}
                placeholder="Header value"
                className="flex-1 text-sm"
              />
              <Button onClick={() => saveHeader(idx)} variant="ghost" size="icon" className="text-white h-8 w-8">
                <CheckIcon className="w-4 h-4" />
              </Button>
              <Button onClick={() => cancelEdit(idx)} variant="ghost" size="icon" className="text-white h-8 w-8">
                <XIcon className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm text-white w-32 truncate">{hdr.key}</span>
              <span className="text-sm text-white flex-1 truncate">{hdr.value}</span>
              <Button onClick={() => editHeader(idx)} variant="ghost" size="icon" className="text-white h-8 w-8">
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button onClick={() => removeHeader(idx)} variant="ghost" size="icon" className="text-red-400 h-8 w-8">
                <TrashIcon className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      ))}
      <Button onClick={addEmptyHeaderRow} variant="ghost" size="sm" className="mt-2 w-fit">
        <PlusIcon className="w-4 h-4" /> Add Header
      </Button>
    </div>
  )
}

interface SubprotocolItem {
  value: string
  isEditing: boolean
  isNew?: boolean
}

interface SubprotocolsTabProps {
  subprotocols: string[]
  setWsConfig: React.Dispatch<React.SetStateAction<WebSocketConfig>>
}

export const SubprotocolsTab = ({ subprotocols, setWsConfig }: SubprotocolsTabProps) => {
  const [subprotocolsList, setSubprotocolsList] = useState<SubprotocolItem[]>([])
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!hasInitialized.current) {
      const initial = subprotocols.map(value => ({
        value,
        isEditing: false
      }))
      setSubprotocolsList(initial)
      hasInitialized.current = true
    }
  }, [subprotocols])

  useEffect(() => {
    const newSubprotocols = subprotocolsList
      .filter(s => s.value.trim())
      .map(s => s.value)
    setWsConfig(prev => ({ ...prev, subprotocols: newSubprotocols }))
  }, [subprotocolsList, setWsConfig])

  const updateSubprotocol = (idx: number, val: string) =>
    setSubprotocolsList(list => list.map((s, i) =>
      i === idx ? { ...s, value: val } : s
    ))

  const saveSubprotocol = (idx: number) =>
    setSubprotocolsList(list => list.map((s, i) =>
      i === idx ? { ...s, isEditing: false, isNew: false } : s
    ))

  const cancelEdit = (idx: number) =>
    setSubprotocolsList(list =>
      list.reduce<SubprotocolItem[]>((acc, s, i) => {
        if (i === idx) {
          if (s.isNew) return acc
          return [...acc, { ...s, isEditing: false }]
        }
        return [...acc, s]
      }, [])
    )

  const editSubprotocol = (idx: number) =>
    setSubprotocolsList(list =>
      list.map((s, i) => (i === idx ? { ...s, isEditing: true } : s))
    )

  const removeSubprotocol = (idx: number) =>
    setSubprotocolsList(list => list.filter((_, i) => i !== idx))

  const addSubprotocolRow = () =>
    setSubprotocolsList(list => [
      ...list, { value: '', isEditing: true, isNew: true }
    ])

  return (
    <div className="flex flex-col gap-2 px-2 py-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-400 flex-1">Subprotocol</span>
      </div>
      {subprotocolsList.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          {s.isEditing ? (
            <>
              <Input
                value={s.value}
                onChange={e => updateSubprotocol(i, (e.target as HTMLInputElement).value)}
                placeholder="Subprotocol name"
                className="flex-1 text-sm"
              />
              <Button onClick={() => saveSubprotocol(i)} variant="ghost" size="icon" className="text-white h-8 w-8">
                <CheckIcon className="w-4 h-4" />
              </Button>
              <Button onClick={() => cancelEdit(i)} variant="ghost" size="icon" className="text-white h-8 w-8">
                <XIcon className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 truncate text-sm">{s.value}</span>
              <Button onClick={() => editSubprotocol(i)} variant="ghost" size="icon" className="text-white h-8 w-8">
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button onClick={() => removeSubprotocol(i)} variant="ghost" size="icon" className="text-red-400 h-8 w-8">
                <TrashIcon className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      ))}
      <Button onClick={addSubprotocolRow} variant="ghost" size="sm" className="text-sky-400 hover:text-sky-300 mt-2 self-start">
        + Add Subprotocol
      </Button>
    </div>
  )
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

// Internal playground component that contains the actual WebSocket UI
function WebSocketPlaygroundInternal({
  url,
  title,
  description,
  subprotocols: defaultSubprotocols = [],
  headers: defaultHeaders = {},
  servers = [],
  authType = 'none'
}: WebSocketPlaygroundProps) {
  const [selectedTab, setSelectedTab] = useState(0)
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState<WebSocketServer | null>(servers?.[0] || null)
  const wsRef = useRef<WebSocket | null>(null)
  const messageIdRef = useRef(0)

  // WebSocket configuration state
  const [wsConfig, setWsConfig] = useState<WebSocketConfig>({
    url: (selectedServer?.url || '') + url,
    headers: { ...defaultHeaders },
    subprotocols: [...defaultSubprotocols]
  })

  // Auth state
  const [auth, setAuth] = useState({
    type: authType,
    token: '',
    apiKey: '',
    username: '',
    password: ''
  })

  // Update URL when server changes
  useEffect(() => {
    if (selectedServer) {
      setWsConfig(prev => ({ ...prev, url: selectedServer.url + url }))
    }
  }, [selectedServer, url])

  const addMessage = useCallback((type: WebSocketMessage['type'], data: string, binary = false) => {
    const message: WebSocketMessage = {
      id: (++messageIdRef.current).toString(),
      type,
      data,
      timestamp: Date.now(),
      binary
    }
    setMessages(prev => [...prev, message])
  }, [])

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    setConnectionState('connecting')
    setError(null)

    try {
      // Prepare headers based on auth type
      const headers = { ...wsConfig.headers }
      
      switch (auth.type) {
        case 'bearer':
          if (auth.token) {
            headers['Authorization'] = `Bearer ${auth.token}`
          }
          break
        case 'apiKey':
          if (auth.apiKey) {
            headers['X-API-Key'] = auth.apiKey
          }
          break
        case 'basic':
          if (auth.username && auth.password) {
            headers['Authorization'] = `Basic ${btoa(`${auth.username}:${auth.password}`)}`
          }
          break
      }

      const ws = new WebSocket(wsConfig.url, wsConfig.subprotocols)
      
      ws.onopen = () => {
        setConnectionState('connected')
        addMessage('system', 'Connected to WebSocket server')
      }

      ws.onmessage = (event) => {
        const isBinary = event.data instanceof ArrayBuffer || event.data instanceof Blob
        const data = isBinary ? 
          `[Binary data: ${event.data instanceof Blob ? event.data.size : event.data.byteLength} bytes]` : 
          event.data
        addMessage('received', data, isBinary)
      }

      ws.onerror = () => {
        setConnectionState('error')
        setError('WebSocket connection error')
        addMessage('error', 'Connection error occurred')
      }

      ws.onclose = (event) => {
        setConnectionState('disconnected')
        const reason = event.reason || 'Connection closed'
        addMessage('system', `Disconnected: ${reason} (Code: ${event.code})`)
      }

      wsRef.current = ws
    } catch (err) {
      setConnectionState('error')
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }, [wsConfig, auth, addMessage])

  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const sendMessage = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && messageInput.trim()) {
      try {
        wsRef.current.send(messageInput)
        addMessage('sent', messageInput)
        setMessageInput('')
      } catch (err) {
        addMessage('error', `Failed to send message: ${err}`)
      }
    }
  }, [messageInput, addMessage])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  const tabs = [
    { name: 'Headers', key: 'headers' },
    { name: 'Subprotocols', key: 'subprotocols' },
    { name: 'Auth', key: 'auth' }
  ]

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case 'connected':
        return 'text-green-400'
      case 'connecting':
        return 'text-yellow-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-zinc-400'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionState) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Error'
      default:
        return 'Disconnected'
    }
  }

  return (
    <div className="my-6 overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex min-h-[calc(--spacing(12)+1px)] flex-wrap items-start gap-x-4 px-4 pt-2 pb-4 justify-between">
        <div className="flex items-center gap-3 pt-3">
          <Tag variant="small">WS</Tag>
          <span className="font-mono text-sm">{title || url}</span>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectionState === 'connected' ? 'bg-green-400' : connectionState === 'connecting' ? 'bg-yellow-400' : connectionState === 'error' ? 'bg-red-400' : 'bg-zinc-400'}`} />
            <span className={`text-xs ${getConnectionStatusColor()}`}>
              {getConnectionStatusText()}
            </span>
          </div>
        </div>
        <div className="flex gap-2 ml-auto pt-3">
          <Button
            onClick={connectWebSocket}
            disabled={connectionState === 'connecting' || connectionState === 'connected'}
            className={classNames(
              'flex items-center gap-2',
              connectionState === 'connecting' || connectionState === 'connected'
                ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            )}
          >
            {connectionState === 'connecting' ? (
              <LoadingSpinner className="h-4 w-4" />
            ) : (
              <PlayButton className="h-4 w-4" />
            )}
            {connectionState === 'connecting' ? 'Connecting...' : 'Connect'}
          </Button>
          <Button
            onClick={disconnectWebSocket}
            disabled={connectionState === 'disconnected'}
            variant="destructive"
            className={classNames(
              'flex items-center gap-2',
              connectionState === 'disconnected' && 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
            )}
          >
            <DisconnectButton className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </div>

      {description && (
        <p className="text-sm px-4 py-3">{description}</p>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Configuration */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 p-4">
            <label className="text-sm font-medium">Server</label>
            <Dropdown
              buttonLabel={selectedServer?.description || selectedServer?.url || 'Select Server'}
              items={servers.map(server => ({ 
                label: server.description || server.url, 
                onClick: () => setSelectedServer(server) 
              }))}
              className="w-full"
            />
          </div>

          <div>
            <TabGroup selectedIndex={selectedTab} onChange={setSelectedTab}>
              <TabList className="flex">
                {tabs.map((tab) => (
                  <Tab
                    key={tab.key}
                    className={({ selected }) =>
                      classNames(
                        'px-4 py-3 text-sm font-medium transition border-b-2',
                        selected
                          ? 'border-brand-foreground text-brand-foreground'
                          : 'border-transparent text-zinc-400 hover:text-zinc-300'
                      )
                    }
                  >
                    {tab.name}
                  </Tab>
                ))}
              </TabList>

              <TabPanels className="min-h-[250px]">
                <TabPanel className="p-4">
                  <HeadersTab 
                    wsConfig={wsConfig}
                    setWsConfig={setWsConfig}
                  />
                </TabPanel>

                <TabPanel className="p-4">
                  <SubprotocolsTab
                    subprotocols={wsConfig.subprotocols}
                    setWsConfig={setWsConfig}
                  />
                </TabPanel>

                {/* Auth Tab */}
                <TabPanel className="p-4 space-y-4">
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">Authentication Type</label>
                    <Dropdown
                      buttonLabel={auth.type === 'none' ? 'Select Auth Type' : auth.type.charAt(0).toUpperCase() + auth.type.slice(1)}
                      items={[
                        { label: 'None', onClick: () => setAuth(prev => ({ ...prev, type: 'none' })) },
                        { label: 'Bearer Token', onClick: () => setAuth(prev => ({ ...prev, type: 'bearer' })) },
                        { label: 'API Key', onClick: () => setAuth(prev => ({ ...prev, type: 'apiKey' })) },
                        { label: 'Basic Auth', onClick: () => setAuth(prev => ({ ...prev, type: 'basic' })) }
                      ]}
                      className="w-full"
                    />
                  </div>

                  {auth.type === 'bearer' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Bearer Token</label>
                      <Input
                        type="password"
                        value={auth.token}
                        onChange={(e) => setAuth(prev => ({ ...prev, token: (e.target as HTMLInputElement).value }))}
                        placeholder="Enter bearer token..."
                        className="w-full text-sm"
                      />
                    </div>
                  )}

                  {auth.type === 'apiKey' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">API Key</label>
                      <Input
                        type="password"
                        value={auth.apiKey}
                        onChange={(e) => setAuth(prev => ({ ...prev, apiKey: (e.target as HTMLInputElement).value }))}
                        placeholder="Enter API key..."
                        className="w-full text-sm"
                      />
                    </div>
                  )}

                  {auth.type === 'basic' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Username</label>
                        <Input
                          type="text"
                          value={auth.username}
                          onChange={(e) => setAuth(prev => ({ ...prev, username: (e.target as HTMLInputElement).value }))}
                          placeholder="Enter username..."
                          className="w-full text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <Input
                          type="password"
                          value={auth.password}
                          onChange={(e) => setAuth(prev => ({ ...prev, password: (e.target as HTMLInputElement).value }))}
                          placeholder="Enter password..."
                          className="w-full text-sm"
                        />
                      </div>
                    </div>
                  )}
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 min-w-0">
          <div>
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-sm font-semibold">Messages</h3>
              <Button
                onClick={clearMessages}
                variant="ghost"
                size="sm"
                className="text-xs text-zinc-400 hover:text-zinc-300"
              >
                Clear
              </Button>
            </div>
            
            <div className="flex flex-col h-64 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <EmptyState icon={<MessageCircleIcon className="h-5 w-5" />} title="No messages yet" description="Connect to start receiving messages" />
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={classNames(
                      'flex flex-col gap-1 p-3 rounded-lg text-sm',
                      msg.type === 'sent' && 'bg-sky-500/10 border border-sky-500/20 ml-8',
                      msg.type === 'received' && 'bg-green-500/10 border border-green-500/20 mr-8',
                      msg.type === 'error' && 'bg-red-500/10 border border-red-500/20',
                      msg.type === 'system' && 'bg-zinc-500/10 border border-zinc-500/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className={classNames(
                        'text-xs font-medium',
                        msg.type === 'sent' && 'text-sky-400',
                        msg.type === 'received' && 'text-green-400',
                        msg.type === 'error' && 'text-red-400',
                        msg.type === 'system' && 'text-zinc-400'
                      )}>
                        {msg.type === 'sent' ? 'Sent' : 
                         msg.type === 'received' ? 'Received' : 
                         msg.type === 'error' ? 'Error' : 'System'}
                        {msg.binary && ' (Binary)'}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-white break-words font-mono text-xs">
                      {msg.data}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Send Message */}
            <div className="p-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput((e.target as HTMLInputElement).value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Enter message to send..."
                  disabled={connectionState !== 'connected'}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={sendMessage}
                  disabled={connectionState !== 'connected' || !messageInput.trim()}
                  className={classNames({
                    'bg-sky-600 text-white hover:bg-sky-700': connectionState === 'connected' && messageInput.trim()
                  })}
                >
                  Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 ring-1 ring-rose-500/20">
              Error
            </span>
          </div>
          <pre className="text-sm text-rose-400 bg-rose-500/5 p-3 rounded-lg border border-rose-500/20 mt-2">
            {error}
          </pre>
        </div>
      )}
    </div>
  )
}

// Main exported component with Sheet wrapper
export function WebSocketPlayground(props: WebSocketPlaygroundProps) {
  const [showPlayground, setShowPlayground] = useState(false)

  const handleShowPlayground = () => {
    setShowPlayground(true)
  }

  return (
    <div className="max-w-none w-full my-6">
      <Sheet open={showPlayground} onOpenChange={setShowPlayground} modal={true}>
        <SheetContent side="bottom" className="h-[90vh] w-full overflow-y-auto p-8">
          <SheetHeader className="p-0">
            <SheetTitle>WebSocket Playground</SheetTitle>
          </SheetHeader>
          <WebSocketPlaygroundInternal {...props} />
        </SheetContent>
      </Sheet>

      <Card className="overflow-hidden py-0 border-1 border-black/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Tag variant="small">WS</Tag>
            <span className="font-mono text-sm">{props.title || props.url}</span>
          </div>
          <Button
            onClick={handleShowPlayground}
            className="flex items-center gap-2"
          >
            Try
            <PlayButton className="h-4 w-4" />
          </Button>
        </div>

        {props.description && (
          <p className="text-sm px-4 py-3">{props.description}</p>
        )}

        <div className="px-4 py-3">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">Endpoint:</span>
              <Badge>
                {props.servers?.[0]?.url || 'ws://localhost'}{props.url}
              </Badge>
            </div>

            {props.subprotocols && props.subprotocols.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-400">Subprotocols:</span>
                <div className="flex gap-1">
                  {props.subprotocols.map((protocol, idx) => (
                    <Badge key={idx}>
                      {protocol}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {props.authType && props.authType !== 'none' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-400">Authentication:</span>
                <Badge>
                  {props.authType}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}