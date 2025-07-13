import { useState } from "preact/hooks"
import { APIGroup } from "./api"
import { WebSocketPlayground, ConnectButton, type WebSocketServer } from "./websocket-playground"
import { Fence } from "./fence"
import { Tag } from "./tag"
import { Col, Row } from "./text"
import { motion } from "motion/react"
import { Properties, Property } from "./open-api"

interface AsyncAPIMessage {
  name?: string
  title?: string
  summary?: string
  description?: string
  payload?: Schema
  headers?: Schema
  correlationId?: {
    description?: string
    location?: string
  }
  schemaFormat?: string
  contentType?: string
  examples?: any[]
}

interface AsyncAPIOperation {
  operationId?: string
  summary?: string
  description?: string
  tags?: Array<{
    name: string
    description?: string
  }>
  message?: AsyncAPIMessage | {
    oneOf?: AsyncAPIMessage[]
  }
  bindings?: {
    ws?: {
      method?: string
      query?: Schema
      headers?: Schema
      bindingVersion?: string
    }
  }
}

interface AsyncAPIChannel {
  address?: string
  title?: string
  summary?: string
  description?: string
  subscribe?: AsyncAPIOperation
  publish?: AsyncAPIOperation
  parameters?: Record<string, Parameter>
  messages?: Record<string, AsyncAPIMessage>
  bindings?: {
    ws?: {
      method?: string
      query?: Schema
      headers?: Schema
      bindingVersion?: string
    }
  }
}

interface Schema {
  $ref?: string
  type?: string
  items?: Schema
  properties?: Record<string, Schema>
  required?: string[]
  description?: string
  default?: any
  example?: any
  format?: string
  enum?: any[]
  oneOf?: Schema[]
  anyOf?: Schema[]
  allOf?: Schema[]
}

interface Parameter {
  description?: string
  schema?: Schema
  location?: string
  default?: any
}

interface Components {
  schemas?: Record<string, Schema>
  messages?: Record<string, AsyncAPIMessage>
  parameters?: Record<string, Parameter>
}

interface Info {
  title: string
  version: string
  description?: string
  termsOfService?: string
  contact?: {
    name?: string
    url?: string
    email?: string
  }
  license?: {
    name: string
    url?: string
  }
}

export interface AsyncAPIJson {
  asyncapi: string
  info: Info
  servers?: Record<string, WebSocketServer & {
    host?: string
    pathname?: string
    protocol?: string
    protocolVersion?: string
    description?: string
    title?: string
    summary?: string
    variables?: Record<string, any>
    security?: any[]
    tags?: Array<{
      name: string
      description?: string
    }>
    bindings?: any
  }>
  channels: Record<string, AsyncAPIChannel>
  components?: Components
  defaultContentType?: string
}

function resolveSchema(schema: Schema | undefined, components: Components): Schema {
  if (!schema) return {}

  if (schema.$ref) {
    const refPath = schema.$ref.replace(/^#\/components\/schemas\//, '')
    return resolveSchema(components.schemas?.[refPath], components)
  }

  if (schema.type === 'array' && schema.items) {
    return {
      ...schema,
      items: resolveSchema(schema.items, components)
    }
  }

  if (schema.properties) {
    const resolvedProps: Record<string, Schema> = {}
    for (const [key, value] of Object.entries(schema.properties)) {
      resolvedProps[key] = resolveSchema(value, components)
    }
    return {
      ...schema,
      properties: resolvedProps
    }
  }

  return schema
}

function isDirectMessage(message: AsyncAPIMessage | { oneOf?: AsyncAPIMessage[] } | undefined): message is AsyncAPIMessage {
  return message != null && !('oneOf' in message);
}

export function AsyncAPI({ 
  asyncAPIJson, 
  channel: selectedChannel, 
  operation: selectedOperation 
}: { 
  asyncAPIJson: AsyncAPIJson
  channel: string
  operation: 'subscribe' | 'publish'
}) {
  const { channels, components, servers } = asyncAPIJson
  const [showPlayground, setShowPlayground] = useState(false)

  const handleShowPlayground = () => {
    setShowPlayground(true)
  }

  // Convert AsyncAPI servers to WebSocket servers
  const wsServers: WebSocketServer[] = servers ? Object.entries(servers).map(([key, server]) => ({
    url: `${server.protocol}://${server.host}${server.pathname || ''}`,
    description: server.description || server.title || key,
    protocol: server.protocol
  })) : []

  return (
    <div className="max-w-none w-full">
      {showPlayground && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white dark:bg-[#1e1e1e] shadow-xl z-50 overflow-y-auto border-l border-zinc-200 dark:border-zinc-800"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">WebSocket Playground</h2>
              <button
                onClick={() => setShowPlayground(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <WebSocketPlayground
              url={selectedChannel}
              servers={wsServers}
            />
          </div>
        </motion.div>
      )}

      {Object.entries(channels).map(([channelPath, channelDetails]) => {
        if (channelPath !== selectedChannel) {
          return null
        }

        const operation = channelDetails[selectedOperation]
        if (!operation) {
          return null
        }

        const { summary, description, message } = operation
        const resolvedMessage = isDirectMessage(message) ? message : 
          (message?.oneOf && message.oneOf.length > 0 ? message.oneOf[0] : undefined)
        
        return (
          <div key={channelPath} className="my-8">
            <Row cols={2}>
              <Col>
                <h2 className="flex items-center mt-4">
                  <Tag variant="medium" className="mr-2 py-1 px-4 rounded-lg">
                    {selectedOperation.toUpperCase()}
                  </Tag>
                  <span className="ml-2 font-mono">{channelPath}</span>
                </h2>

                {(summary || description) && (
                  <p>{summary || description}</p>
                )}

                {resolvedMessage && (
                  <div className="mt-4">
                    <h3>Message</h3>
                    {resolvedMessage.title && <h4>{resolvedMessage.title}</h4>}
                    {resolvedMessage.description && <p>{resolvedMessage.description}</p>}
                    
                    {resolvedMessage.payload && (
                      <div className="mt-4">
                        <h4>Payload</h4>
                        {(() => {
                          const resolvedPayload = resolveSchema(resolvedMessage.payload, components || {})
                          return (
                            <Properties>
                              {Object.entries(resolvedPayload.properties || {}).map(([propName, prop]) => (
                                <Property
                                  key={propName}
                                  name={propName}
                                  type={prop.type || 'string'}
                                  required={resolvedPayload.required?.includes(propName)}
                                >
                                  {prop.description}
                                  {prop.default !== undefined && (
                                    <span className="text-gray-500 ml-1">(default: {JSON.stringify(prop.default)})</span>
                                  )}
                                </Property>
                              ))}
                            </Properties>
                          )
                        })()}
                      </div>
                    )}

                    {resolvedMessage.headers && (
                      <div className="mt-4">
                        <h4>Headers</h4>
                        {(() => {
                          const resolvedHeaders = resolveSchema(resolvedMessage.headers, components || {})
                          return (
                            <Properties>
                              {Object.entries(resolvedHeaders.properties || {}).map(([headerName, header]) => (
                                <Property
                                  key={headerName}
                                  name={headerName}
                                  type={header.type || 'string'}
                                  required={resolvedHeaders.required?.includes(headerName)}
                                >
                                  {header.description}
                                </Property>
                              ))}
                            </Properties>
                          )
                        })()}
                      </div>
                    )}

                    {resolvedMessage?.examples && resolvedMessage.examples.length > 0 && (
                      <div className="mt-4">
                        <h4>Examples</h4>
                        {resolvedMessage.examples.map((example: any, idx: number) => (
                          <Fence key={idx} language="json">
                            {JSON.stringify(example, null, 2)}
                          </Fence>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {components?.schemas && (
                  <div className="mt-4">
                    <h3>Schemas</h3>
                    {Object.entries(components.schemas).filter(([, schema]) => schema.properties).map(([name, schema]) => (
                      <div key={name} className="mt-4">
                        <h4>{name}</h4>
                        <Properties>
                          {Object.entries(schema.properties || {}).map(([propName, prop]) => (
                            <Property
                              key={propName}
                              name={propName}
                              type={prop.type || 'string'}
                              required={schema.required?.includes(propName)}
                            >
                              {prop.description}
                            </Property>
                          ))}
                        </Properties>
                      </div>
                    ))}
                  </div>
                )}
              </Col>
              <Col sticky>
                <button
                  onClick={handleShowPlayground}
                  className='ml-auto mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition bg-sky-600 text-white hover:bg-sky-700'
                >
                  Try
                  <ConnectButton className="h-4 w-4" />
                </button>
                <APIGroup title="Message" tag={selectedOperation.toUpperCase()} label={channelPath}>
                  {resolvedMessage?.payload && (() => {
                    const resolvedPayload = resolveSchema(resolvedMessage.payload, components || {})
                    return (
                      <Fence language="json">
                        {JSON.stringify(resolvedPayload, null, 2)}
                      </Fence>
                    )
                  })()}
                </APIGroup>
              </Col>
            </Row>
          </div>
        )
      })}
    </div>
  )
}