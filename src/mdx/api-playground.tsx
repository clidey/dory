import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react'
import classNames from 'classnames'
import { useState, useEffect } from 'react'
import { Tag } from './tag'
import { Fence } from './fence'

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
  baseUrl?: string
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

function PlayButton(props: React.ComponentPropsWithoutRef<'svg'>) {
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

export function APIPlayground({
  method,
  url,
  title,
  description,
  parameters = [],
  headers: defaultHeaders = {},
  body: defaultBody,
  authType = 'none',
  baseUrl = ''
}: APIPlaygroundProps) {
  const [selectedTab, setSelectedTab] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<ResponseData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Request configuration state
  const [requestConfig, setRequestConfig] = useState<RequestConfig>({
    method: method.toUpperCase(),
    url: baseUrl + url,
    headers: { 'Content-Type': 'application/json', ...defaultHeaders },
    queryParams: {},
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

  // Parameter values state
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    parameters.forEach(param => {
      initial[param.name] = param.defaultValue || ''
    })
    return initial
  })

  // Additional headers state
  const [customHeaders, setCustomHeaders] = useState<Record<string, string>>({})

  // Update URL with parameters
  useEffect(() => {
    let finalUrl = baseUrl + url
    
    // Replace path parameters
    Object.entries(paramValues).forEach(([key, value]) => {
      if (value && url.includes(`{${key}}`)) {
        finalUrl = finalUrl.replace(`{${key}}`, encodeURIComponent(value))
      }
    })

    // Add query parameters
    const queryString = new URLSearchParams(requestConfig.queryParams).toString()
    if (queryString) {
      finalUrl += `?${queryString}`
    }

    setRequestConfig(prev => ({ ...prev, url: finalUrl }))
  }, [paramValues, requestConfig.queryParams, url, baseUrl])

  // Update headers with auth
  useEffect(() => {
    const headers = { ...requestConfig.headers, ...customHeaders }
    
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

    setRequestConfig(prev => ({ ...prev, headers }))
  }, [auth, customHeaders, requestConfig.headers])

  const executeRequest = async () => {
    setIsLoading(true)
    setError(null)
    setResponse(null)

    const startTime = Date.now()

    try {
      const fetchOptions: RequestInit = {
        method: requestConfig.method,
        headers: requestConfig.headers
      }

      if (requestConfig.method !== 'GET' && requestConfig.body) {
        fetchOptions.body = requestConfig.body
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
  }

  const addCustomHeader = () => {
    const key = prompt('Header name:')
    const value = prompt('Header value:')
    if (key && value) {
      setCustomHeaders(prev => ({ ...prev, [key]: value }))
    }
  }

  const removeCustomHeader = (key: string) => {
    setCustomHeaders(prev => {
      const newHeaders = { ...prev }
      delete newHeaders[key]
      return newHeaders
    })
  }

  const tabs = [
    { name: 'Parameters', key: 'params' },
    { name: 'Headers', key: 'headers' },
    { name: 'Body', key: 'body' },
    { name: 'Auth', key: 'auth' }
  ]

  return (
    <div className="my-6 overflow-hidden rounded-2xl bg-zinc-900 shadow-md dark:ring-1 dark:ring-white/10">
      {/* Header */}
      <div className="flex min-h-[calc(--spacing(12)+1px)] flex-wrap items-start gap-x-4 border-b border-zinc-700 bg-zinc-800 px-4 dark:border-zinc-800 dark:bg-transparent">
        <div className="flex items-center gap-3 pt-3">
          <Tag variant="small">{method.toUpperCase()}</Tag>
          <span className="font-mono text-sm text-white">{title || url}</span>
        </div>
        <button
          onClick={executeRequest}
          disabled={isLoading}
          className={classNames(
            'ml-auto mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition',
            isLoading
              ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          )}
        >
          {isLoading ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            <PlayButton className="h-4 w-4" />
          )}
          {isLoading ? 'Sending...' : 'Send Request'}
        </button>
      </div>

      {description && (
        <div className="px-4 py-3 border-b border-zinc-700 dark:border-zinc-800">
          <p className="text-sm text-zinc-300">{description}</p>
        </div>
      )}

      <div className="flex">
        {/* Request Configuration */}
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
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-zinc-400 hover:text-zinc-300'
                    )
                  }
                >
                  {tab.name}
                </Tab>
              ))}
            </TabList>

            <TabPanels>
              {/* Parameters Tab */}
              <TabPanel className="p-4 space-y-4">
                {parameters.length > 0 ? (
                  parameters.map((param) => (
                    <div key={param.name} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-white">{param.name}</label>
                        {param.required && <span className="text-xs text-rose-400">Required</span>}
                        <span className="text-xs text-zinc-400">{param.type}</span>
                      </div>
                      <input
                        type="text"
                        value={paramValues[param.name] || ''}
                        onChange={(e) => setParamValues(prev => ({ ...prev, [param.name]: e.target.value }))}
                        placeholder={param.description}
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">No parameters required for this endpoint.</p>
                )}
              </TabPanel>

              {/* Headers Tab */}
              <TabPanel className="p-4 space-y-4">
                <div className="space-y-3">
                  {Object.entries(requestConfig.headers).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-300 w-32">{key}:</span>
                      <span className="text-sm text-zinc-400">{value}</span>
                    </div>
                  ))}
                  
                  {Object.entries(customHeaders).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-300 w-32">{key}:</span>
                      <span className="text-sm text-zinc-400 flex-1">{value}</span>
                      <button
                        onClick={() => removeCustomHeader(key)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={addCustomHeader}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  + Add Custom Header
                </button>
              </TabPanel>

              {/* Body Tab */}
              <TabPanel className="p-4">
                {['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Request Body (JSON)</label>
                    <textarea
                      value={requestConfig.body}
                      onChange={(e) => setRequestConfig(prev => ({ ...prev, body: e.target.value }))}
                      placeholder="Enter JSON body..."
                      rows={8}
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">Request body not applicable for {method.toUpperCase()} requests.</p>
                )}
              </TabPanel>

              {/* Auth Tab */}
              <TabPanel className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Authentication Type</label>
                  <select
                    value={auth.type}
                    onChange={(e) => setAuth(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="none">None</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apiKey">API Key</option>
                    <option value="basic">Basic Auth</option>
                  </select>
                </div>

                {auth.type === 'bearer' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Bearer Token</label>
                    <input
                      type="password"
                      value={auth.token}
                      onChange={(e) => setAuth(prev => ({ ...prev, token: e.target.value }))}
                      placeholder="Enter bearer token..."
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                {auth.type === 'apiKey' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">API Key</label>
                    <input
                      type="password"
                      value={auth.apiKey}
                      onChange={(e) => setAuth(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter API key..."
                      className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                {auth.type === 'basic' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Username</label>
                      <input
                        type="text"
                        value={auth.username}
                        onChange={(e) => setAuth(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter username..."
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white">Password</label>
                      <input
                        type="password"
                        value={auth.password}
                        onChange={(e) => setAuth(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Enter password..."
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white placeholder-zinc-400 focus:border-emerald-500 focus:outline-none"
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
          <div className="border-b border-zinc-700 dark:border-zinc-800 px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Response</h3>
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
                      ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                      : response.status >= 400
                      ? 'bg-rose-500/10 text-rose-400 ring-rose-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20'
                  )}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="text-xs text-zinc-400">{response.duration}ms</span>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">Response Body</h4>
                  <Fence language="json">
                    {typeof response.data === 'string' 
                      ? response.data 
                      : JSON.stringify(response.data, null, 2)
                    }
                  </Fence>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">Response Headers</h4>
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
              <div className="text-center py-8">
                <div className="text-zinc-400 text-sm">
                  Click "Send Request" to see the response
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}