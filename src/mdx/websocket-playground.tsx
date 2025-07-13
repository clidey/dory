import { Input, Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import { PencilIcon, TrashIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { Highlight, themes } from 'prism-react-renderer'
import Dropdown from '../components/dropdown'
import { useDarkMode } from '../utils/hooks'
import { Fence } from './fence'
import { Tag } from './tag'

export interface Server {
  url: string;
  description?: string;
}

interface WebSocketPlaygroundProps {
  url: string
  title?: string
  description?: string
  headers?: Record<string, string>
  protocols?: string[]
  servers?: Server[]
}

interface RequestConfig {
  url: string
  headers: Record<string, string>
  protocols: string[]
}

interface WebSocketMessage {
  id: string
  type: 'sent' | 'received' | 'connection' | 'error'
  content: string
  timestamp: number
  messageType?: 'text' | 'binary'
}

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  error?: string
  connectedAt?: number
}

export function PlayButton(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z"
      />
    </svg>
  )
}

export function DisconnectButton(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
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

interface HeadersTabProps {
  requestConfig: RequestConfig
  setRequestConfig: React.Dispatch<React.SetStateAction<RequestConfig>>
}

interface HeaderItem {
  key: string
  value: string
  isEditing: boolean
  isNew?: boolean
}

export const HeadersTab = ({ requestConfig, setRequestConfig }: HeadersTabProps) => {
  const [headersList, setHeadersList] = useState<HeaderItem[]>([])
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!hasInitialized.current) {
      const initialHeaders = Object.entries(requestConfig.headers ?? {}).map(([key, value]) => ({
        key,
        value,
        isEditing: false
      }))
      setHeadersList(initialHeaders)
      hasInitialized.current = true
    }
  }, [requestConfig.headers])

  useEffect(() => {
    const newHeaders: Record<string, string> = {}
    headersList.forEach(h => {
      if (h.key.trim()) newHeaders[h.key] = h.value
    })
    setRequestConfig(prev => ({ ...prev, headers: newHeaders }))
  }, [headersList, setRequestConfig])

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
          if (h.isNew) return acc
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
                className="w-32 rounded-lg bg-zinc-800 border border-zinc-600 px-2 py-1 text-sm text-white"
              />
              <Input
                type="text"
                value={hdr.value}
                onChange={e => updateHeader(idx, 'value', (e.target as HTMLInputElement).value)}
                placeholder="Header value"
                className="flex-1 rounded-lg bg-zinc-800 border border-zinc-600 px-2 py-1 text-sm text-white"
              />
              <button onClick={() => saveHeader(idx)} className="text-white">
                <CheckIcon className="w-4 h-4" />
              </button>
              <button onClick={() => cancelEdit(idx)} className="text-white">
                <XIcon className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-white w-32 truncate">{hdr.key}</span>
              <span className="text-sm text-white flex-1 truncate">{hdr.value}</span>
              <button onClick={() => editHeader(idx)} className="text-white">
                <PencilIcon className="w-4 h-4" />
              </button>
              <button onClick={() => removeHeader(idx)} className="text-red-400">
                <TrashIcon className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      ))}
      <button onClick={addEmptyHeaderRow} className="text-sm text-sky-400 hover:text-sky-300 mt-2 w-fit">
        + Add Header
      </button>
    </div>
  )
}

export function WebSocketPlayground({
  url,
  title,
  description,
  headers: defaultHeaders = {},
  protocols = [],
  servers = []
}: WebSocketPlaygroundProps) {
  const [selectedTab, setSelectedTab] = useState(0)
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'disconnected'
  })
  const [messages, setMessages] = useState<WebSocketMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'binary'>('text')
  const { isDark } = useDarkMode()
  const [selectedServer, setSelectedServer] = useState<Server | null>(servers?.[0] || null)
  const websocketRef = useRef<WebSocket | null>(null)
  const messageIdCounter = useRef(0)
  
  // Request configuration state
  const [requestConfig, setRequestConfig] = useState<RequestConfig>({
    url: (selectedServer?.url || '') + url,
    headers: defaultHeaders,
    protocols: protocols
  })

  const addMessage = useCallback((message: Omit<WebSocketMessage, 'id'>) => {
    const newMessage: WebSocketMessage = {
      ...message,
      id: `msg-${++messageIdCounter.current}`,
    }
    setMessages(prev => [...prev, newMessage])
  }, [])

  const connectWebSocket = useCallback(() => {
    if (websocketRef.current) return

    setConnection({ status: 'connecting' })
    setMessages([])

    try {
      const ws = new WebSocket(
        requestConfig.url,
        requestConfig.protocols.length > 0 ? requestConfig.protocols : undefined
      )

      // Set custom headers if supported by the browser
      // Note: WebSocket API doesn't support custom headers in browsers
      // This is a limitation of the WebSocket API itself
      
      ws.onopen = () => {
        setConnection({ status: 'connected', connectedAt: Date.now() })
        addMessage({
          type: 'connection',
          content: 'Connected to WebSocket server',
          timestamp: Date.now()
        })
      }

      ws.onmessage = (event) => {
        const isBlob = event.data instanceof Blob
        const isBinary = event.data instanceof ArrayBuffer
        
        if (isBlob || isBinary) {
          addMessage({
            type: 'received',
            content: `[Binary message: ${isBlob ? 'Blob' : 'ArrayBuffer'} (${event.data.size || event.data.byteLength} bytes)]`,
            timestamp: Date.now(),
            messageType: 'binary'
          })
        } else {
          addMessage({
            type: 'received',
            content: event.data,
            timestamp: Date.now(),
            messageType: 'text'
          })
        }
      }

      ws.onclose = (event) => {
        setConnection({ status: 'disconnected' })
        addMessage({
          type: 'connection',
          content: `Connection closed (Code: ${event.code}, Reason: ${event.reason || 'None'})`,
          timestamp: Date.now()
        })
        websocketRef.current = null
      }

      ws.onerror = () => {
        setConnection({ status: 'error', error: 'WebSocket connection error' })
        addMessage({
          type: 'error',
          content: 'WebSocket connection error',
          timestamp: Date.now()
        })
      }

      websocketRef.current = ws
    } catch (error) {
      setConnection({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to connect' 
      })
      addMessage({
        type: 'error',
        content: error instanceof Error ? error.message : 'Failed to connect',
        timestamp: Date.now()
      })
    }
  }, [requestConfig, addMessage])

  const disconnectWebSocket = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }
  }, [])

  const sendMessage = useCallback(() => {
    if (!websocketRef.current || !messageInput.trim()) return

    try {
      if (messageType === 'text') {
        websocketRef.current.send(messageInput)
        addMessage({
          type: 'sent',
          content: messageInput,
          timestamp: Date.now(),
          messageType: 'text'
        })
      } else {
        // For binary messages, try to parse as JSON and convert to ArrayBuffer
        const encoder = new TextEncoder()
        const data = encoder.encode(messageInput)
        websocketRef.current.send(data)
        addMessage({
          type: 'sent',
          content: `[Binary message sent: ${data.byteLength} bytes]`,
          timestamp: Date.now(),
          messageType: 'binary'
        })
      }
      
      setMessageInput('')
    } catch (error) {
      addMessage({
        type: 'error',
        content: error instanceof Error ? error.message : 'Failed to send message',
        timestamp: Date.now()
      })
    }
  }, [messageInput, messageType, addMessage])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close()
      }
    }
  }, [])

  const tabs = [
    { name: 'Headers', key: 'headers' },
    { name: 'Protocols', key: 'protocols' },
    { name: 'Messages', key: 'messages' }
  ]

  return (
    <div className="my-6 overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex min-h-[calc(--spacing(12)+1px)] flex-wrap items-start gap-x-4 border-b border-zinc-700 bg-zinc-800 px-4 dark:border-zinc-800 dark:bg-transparent pb-4">
        <div className="flex items-center gap-3 pt-3">
          <Tag variant="small">WS</Tag>
          <span className="font-mono text-sm text-white">{title || url}</span>
          <div className="flex items-center gap-2">
            <div className={classNames(
              'w-2 h-2 rounded-full',
              connection.status === 'connected' ? 'bg-green-500' : 
              connection.status === 'connecting' ? 'bg-yellow-500' : 
              connection.status === 'error' ? 'bg-red-500' : 'bg-gray-500'
            )} />
            <span className={classNames(
              'text-xs',
              connection.status === 'connected' ? 'text-green-400' : 
              connection.status === 'connecting' ? 'text-yellow-400' : 
              connection.status === 'error' ? 'text-red-400' : 'text-gray-400'
            )}>
              {connection.status}
            </span>
          </div>
        </div>
        <button
          onClick={connection.status === 'connected' ? disconnectWebSocket : connectWebSocket}
          disabled={connection.status === 'connecting'}
          className={classNames(
            'ml-auto mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
            connection.status === 'connecting'
              ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
              : connection.status === 'connected'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
          )}
        >
          {connection.status === 'connecting' ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : connection.status === 'connected' ? (
            <DisconnectButton className="h-4 w-4" />
          ) : (
            <PlayButton className="h-4 w-4" />
          )}
          {connection.status === 'connecting' ? 'Connecting...' : 
           connection.status === 'connected' ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {description && (
        <div className="px-4 py-3 border-b border-zinc-700 dark:border-zinc-800">
          <p className="text-sm text-zinc-300">{description}</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Server Selection */}
        {servers.length > 0 && (
          <div className="flex flex-col gap-2 px-4 pt-4">
            <label className="text-sm font-medium text-white">Server</label>
            <Dropdown
              buttonLabel={selectedServer?.description || selectedServer?.url || 'Select Server'}
              items={servers.map(server => ({ 
                label: server.description || server.url, 
                onClick: () => {
                  setSelectedServer(server)
                  setRequestConfig(prev => ({ ...prev, url: server.url + url }))
                }
              }))}
              className="w-full"
            />
          </div>
        )}

        {/* URL Input */}
        <div className="flex flex-col gap-2 px-4">
          <label className="text-sm font-medium text-white">WebSocket URL</label>
          <input
            type="text"
            value={requestConfig.url}
            onChange={(e) => setRequestConfig(prev => ({ ...prev, url: (e.target as HTMLInputElement).value }))}
            placeholder="ws://localhost:8080/ws or wss://api.example.com/ws"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-sky-500 focus:outline-none font-mono"
            disabled={connection.status === 'connected'}
          />
        </div>

        {/* Configuration Tabs */}
        <div className="flex-1 border-r border-zinc-700 dark:border-zinc-800">
          <TabGroup selectedIndex={selectedTab} onChange={setSelectedTab}>
            <TabList className="flex border-b border-zinc-700 dark:border-zinc-800">
              {tabs.map((tab) => (
                <Tab
                  key={tab.key}
                  className={({ selected }) =>
                    classNames(
                      'px-4 py-3 text-sm font-medium transition border-b-2',
                      selected
                        ? 'border-sky-500 text-sky-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                    )
                  }
                >
                  {tab.name}
                </Tab>
              ))}
            </TabList>

            <TabPanels className="min-h-[250px]">
              {/* Headers Tab */}
              <TabPanel className="p-4">
                <div className="space-y-4">
                  <div className="text-sm text-yellow-400 bg-yellow-500/10 px-3 py-2 rounded-lg border border-yellow-500/20">
                    ⚠️ Note: WebSocket headers are only sent during the initial handshake and cannot be modified after connection.
                  </div>
                  <HeadersTab 
                    requestConfig={requestConfig}
                    setRequestConfig={setRequestConfig}
                  />
                </div>
              </TabPanel>

              {/* Protocols Tab */}
              <TabPanel className="p-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-white">Subprotocols</label>
                    <input
                      type="text"
                      value={requestConfig.protocols.join(', ')}
                      onChange={(e) => {
                        const protocols = (e.target as HTMLInputElement).value
                          .split(',')
                          .map(p => p.trim())
                          .filter(p => p.length > 0)
                        setRequestConfig(prev => ({ ...prev, protocols }))
                      }}
                      placeholder="chat, v1.0, graphql-ws"
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-sky-500 focus:outline-none"
                      disabled={connection.status === 'connected'}
                    />
                    <p className="text-xs text-zinc-400">
                      Comma-separated list of WebSocket subprotocols
                    </p>
                  </div>
                </div>
              </TabPanel>

              {/* Messages Tab */}
              <TabPanel className="p-4">
                <div className="space-y-4">
                  {/* Message Input */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-white">Send Message</label>
                      <Dropdown
                        buttonLabel={messageType === 'text' ? 'Text' : 'Binary'}
                        items={[
                          { label: 'Text', onClick: () => setMessageType('text') },
                          { label: 'Binary', onClick: () => setMessageType('binary') }
                        ]}
                        className="w-24"
                      />
                    </div>
                    <div className="flex gap-2">
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput((e.target as HTMLTextAreaElement).value)}
                        placeholder={messageType === 'text' ? 'Type your message...' : 'Enter data to send as binary...'}
                        rows={3}
                        className="flex-1 rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-sky-500 focus:outline-none"
                        disabled={connection.status !== 'connected'}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={connection.status !== 'connected' || !messageInput.trim()}
                        className={classNames(
                          'px-4 py-2 rounded-lg text-sm font-medium transition',
                          connection.status === 'connected' && messageInput.trim()
                            ? 'bg-sky-600 text-white hover:bg-sky-700'
                            : 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
                        )}
                      >
                        Send
                      </button>
                    </div>
                  </div>

                  {/* Message History */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-white">Message History</h4>
                      <button
                        onClick={clearMessages}
                        className="text-xs text-zinc-400 hover:text-zinc-300"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2 border border-zinc-700 rounded-lg p-3 bg-zinc-900">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-zinc-400 text-sm">
                          No messages yet. Connect and start sending messages to see them here.
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div key={message.id} className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <span className={classNames(
                                'px-2 py-1 rounded text-xs font-medium',
                                message.type === 'sent' ? 'bg-blue-500/20 text-blue-400' :
                                message.type === 'received' ? 'bg-green-500/20 text-green-400' :
                                message.type === 'connection' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              )}>
                                {message.type === 'sent' ? 'SENT' : 
                                 message.type === 'received' ? 'RECEIVED' : 
                                 message.type === 'connection' ? 'CONNECTION' : 'ERROR'}
                              </span>
                              <span className="text-zinc-400">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                              {message.messageType && (
                                <span className="text-zinc-500">
                                  ({message.messageType})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-white bg-zinc-800 p-2 rounded font-mono">
                              {message.content}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabPanel>
            </TabPanels>
          </TabGroup>
        </div>
      </div>
    </div>
  )
}