import { Button, TextArea, useTheme, Input } from '@clidey/ux'
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import classNames from 'classnames'
import { PencilIcon, PlusIcon, TrashIcon, XIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'
import { Highlight, themes } from 'prism-react-renderer'
import Dropdown from '../components/dropdown'
import { Fence } from './fence'
import { Tag } from './tag'

export interface Server {
  url: string;
  description?: string;
}

interface APIPlaygroundProps {
  method: string
  url: string
  title?: string
  description?: string
  parameters?: Array<{
    name: string
    type: string
    required?: boolean
    description?: string
    defaultValue?: string
  }>
  headers?: Record<string, string>
  body?: object
  authType?: 'bearer' | 'apiKey' | 'basic' | 'none'
  servers?: Server[]
}

interface RequestConfig {
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  queryParams: Record<string, string>
}

interface ResponseData {
  status: number
  statusText: string
  headers: Record<string, string>
  data: any
  duration: number
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

interface RequestConfig {
  headers: Record<string, string>
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
              <Button onClick={() => saveHeader(idx)}>
                <CheckIcon className="w-4 h-4" />
              </Button>
              <Button onClick={() => cancelEdit(idx)}>
                <XIcon className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm  w-32 truncate">{hdr.key}</span>
              <span className="text-sm  flex-1 truncate">{hdr.value}</span>
              <Button onClick={() => editHeader(idx)}>
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button onClick={() => removeHeader(idx)} className="text-red-400">
                <TrashIcon className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      ))}
      <Button onClick={addEmptyHeaderRow} className="text-sm mt-2 w-fit">
        <PlusIcon className="w-4 h-4" /> Add Header
      </Button>
    </div>
  )
}

interface ParamItem {
  name: string;
  value: string;
  isEditing: boolean;
  isNew?: boolean;
}

interface ParamsTabProps {
  queryParams: Record<string, string>;
  setQueryParams: React.Dispatch<React.SetStateAction<RequestConfig>>;
}

export const ParamsTab = ({ queryParams, setQueryParams }: ParamsTabProps) => {
  const [paramsList, setParamsList] = useState<ParamItem[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current) {
      const initial = Object.entries(queryParams ?? {}).map(([key, value]) => ({
        name: key, value, isEditing: false
      }));
      setParamsList(initial);
      hasInitialized.current = true;
    }
  }, [queryParams]);

  useEffect(() => {
    const newParams: Record<string, string> = {};
    paramsList.forEach(p => {
      if (p.name.trim()) newParams[p.name] = p.value;
    });
    setQueryParams(prev => ({ ...prev, queryParams: newParams }));
  }, [paramsList, setQueryParams]);

  const updateParam = (idx: number, field: 'name' | 'value', val: string) =>
    setParamsList(list => list.map((p, i) =>
      i === idx ? { ...p, [field]: val } : p
    ));

  const saveParam = (idx: number) =>
    setParamsList(list => list.map((p, i) =>
      i === idx ? { ...p, isEditing: false, isNew: false } : p
    ));

  const cancelEdit = (idx: number) =>
    setParamsList(list =>
      list.reduce<ParamItem[]>((acc, p, i) => {
        if (i === idx) {
          if (p.isNew) return acc;
          return [...acc, { ...p, isEditing: false }];
        }
        return [...acc, p];
      }, [])
    );

  const editParam = (idx: number) =>
    setParamsList(list =>
      list.map((p, i) => (i === idx ? { ...p, isEditing: true } : p))
    );

  const removeParam = (idx: number) =>
    setParamsList(list => list.filter((_, i) => i !== idx));

  const addParamRow = () =>
    setParamsList(list => [
      ...list, { name: '', value: '', isEditing: true, isNew: true }
    ]);

  return (
    <div className="flex flex-col gap-2 px-2 py-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-zinc-400 w-32">Name</span>
        <span className="text-sm font-medium text-zinc-400 flex-1">Value</span>
      </div>
      {paramsList.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          {p.isEditing ? (
            <>
              <Input value={p.name} onChange={e => updateParam(i, 'name', (e.target as HTMLInputElement).value)} placeholder="Param name" className="w-32 text-sm" />
              <Input value={p.value} onChange={e => updateParam(i, 'value', (e.target as HTMLInputElement).value)} placeholder="Param value" className="flex-1 text-sm" />
              <Button onClick={() => saveParam(i)}>
                <CheckIcon className="w-4 h-4" />
              </Button>
              <Button onClick={() => cancelEdit(i)}>
                <XIcon className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <span className="w-32 truncate text-sm">{p.name}</span>
              <span className="flex-1 truncate text-sm">{p.value}</span>
              <Button onClick={() => editParam(i)}>
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button onClick={() => removeParam(i)} className="text-red-400">
                <TrashIcon className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      ))}
      <Button onClick={addParamRow} className="mt-2 text-sm self-end">
        <PlusIcon className="w-4 h-4" /> Add Parameter
      </Button>
    </div>
  );
};


export function APIPlayground({
  method,
  url,
  title,
  description,
  parameters = [],
  headers: defaultHeaders = {},
  body: defaultBody,
  authType = 'none',
  servers = []
}: APIPlaygroundProps) {
  const [selectedTab, setSelectedTab] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isDark = useTheme().theme === 'dark';
  const [selectedServer, setSelectedServer] = useState<Server | null>(servers?.[0] || null)
  
  // Request configuration state
  const [requestConfig, setRequestConfig] = useState<RequestConfig>({
    method: method.toUpperCase(),
    url: selectedServer?.url + url,
    headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    queryParams: parameters.reduce((acc, param) => {
      acc[param.name] = param.defaultValue || ''
      return acc
    }, {} as Record<string, string>),
    body: defaultBody ? JSON.stringify(defaultBody, null, 2) : ''
  })

  // Auth state
  const [auth, setAuth] = useState({
    type: authType,
    token: '',
    apiKey: '',
    username: '',
    password: ''
  })

  const executeRequest = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setResponse(null)

    const startTime = Date.now()

    try {
      // Prepare headers based on auth type
      const headers = { ...requestConfig.headers }
      
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

      const fetchOptions: RequestInit = {
        method: requestConfig.method,
        headers
      }

      if (requestConfig.method !== 'GET' && requestConfig.body) {
        fetchOptions.body = JSON.stringify(JSON.parse(requestConfig.body))
      }

      const response = await fetch(requestConfig.url, fetchOptions)
      const endTime = Date.now()

      let responseData
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        duration: endTime - startTime
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setIsLoading(false)
    }
  }, [requestConfig, auth])

  const tabs = [
    { name: 'Parameters', key: 'params' },
    { name: 'Headers', key: 'headers' },
    { name: 'Body', key: 'body' },
    { name: 'Auth', key: 'auth' }
  ]

  return (
    <div className="my-6 overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex min-h-[calc(--spacing(12)+1px)] flex-wrap items-start gap-x-4 px-4 pt-2 pb-4 justify-between">
        <div className="flex items-center gap-3 pt-3">
          <Tag variant="small">{method.toUpperCase()}</Tag>
          <span className="font-mono text-sm">{title || url}</span>
        </div>
        <Button
          onClick={executeRequest}
          disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Request'}
          {isLoading ? <LoadingSpinner className="h-4 w-4" /> : <PlayButton className="h-4 w-4" />}
        </Button>
      </div>

      {description && (
        <p className="text-sm px-4 py-3">{description}</p>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Server</label>
          <Dropdown
            buttonLabel={selectedServer?.description || 'Select Server'}
            items={servers.map(server => ({ label: server.description || server.url, onClick: () => setSelectedServer(server) }))}
            className="w-full"
          />
        </div>

        {/* Request Configuration */}
        <div className="flex-1">
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
                <ParamsTab
                  queryParams={requestConfig.queryParams}
                  setQueryParams={setRequestConfig}
                />
              </TabPanel>

              <TabPanel className="p-4">
                <HeadersTab 
                  requestConfig={requestConfig}
                  setRequestConfig={setRequestConfig}
                />
              </TabPanel>

              {/* Body Tab */}
              <TabPanel className="p-4">
                {['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? (
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">Request Body (JSON)</label>
                    <Highlight
                      code={requestConfig.body || ''}
                      language="json"
                      theme={isDark ? themes.vsDark : themes.vsLight}>
                      {({ className, style }) => (
                        <TextArea
                          value={requestConfig.body}
                          onChange={(e) => setRequestConfig(prev => ({ ...prev, body: (e.target as HTMLTextAreaElement).value }))}
                          placeholder="Enter JSON body..."
                          rows={8}
                          className={`w-full text-sm font-mono ${className}`}
                          style={style}
                        />
                      )}
                    </Highlight>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">Request body not applicable for {method.toUpperCase()} requests.</p>
                )}
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

        {/* Response */}
        <div className="flex-1">
          <div className="px-4 py-3">
            <h3 className="text-sm font-semibold">Response</h3>
          </div>
          
          <div className="p-4">
            {error ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-400 ring-1 ring-rose-500/20">
                    Error
                  </span>
                </div>
                <pre className="text-sm text-rose-400 bg-rose-500/5 p-3 rounded-lg border border-rose-500/20">
                  {error}
                </pre>
              </div>
            ) : response ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className={classNames(
                    'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset',
                    response.status >= 200 && response.status < 300
                      ? 'bg-sky-500/10 text-sky-400 ring-sky-500/20'
                      : response.status >= 400
                      ? 'bg-rose-500/10 text-rose-400 ring-rose-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'
                  )}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-xs text-zinc-400">{response.duration}ms</span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Response Body</h4>
                  <Fence language="json">
                    {typeof response.data === 'string' 
                      ? response.data 
                      : JSON.stringify(response.data, null, 2)
                    }
                  </Fence>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Response Headers</h4>
                  <div className="space-y-1">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="flex text-xs">
                        <span className="text-zinc-400 w-32">{key}:</span>
                        <span className="text-zinc-300">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-center py-8 text-muted-foreground">
                Click"Send Request" to see the response
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}