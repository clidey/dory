import { Properties, Property } from "./open-api"
import { Table, Td, Th } from "./table"
import { WebSocketPanel, type WebSocketServer } from "./websocket-playground"

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

interface AsyncAPIMessage {
  $ref?: string
  name?: string
  title?: string
  summary?: string
  description?: string
  payload?: Schema
  headers?: Schema
  contentType?: string
  examples?: unknown[]
}

interface AsyncAPIOperation {
  operationId?: string
  summary?: string
  description?: string
  message?: AsyncAPIMessage | { oneOf?: AsyncAPIMessage[] }
}

interface AsyncAPIChannel {
  address?: string
  title?: string
  summary?: string
  description?: string
  subscribe?: AsyncAPIOperation
  publish?: AsyncAPIOperation
}

interface Components {
  schemas?: Record<string, Schema>
  messages?: Record<string, AsyncAPIMessage>
}

export interface AsyncAPIJson {
  asyncapi: string
  info: { title: string; version: string; description?: string }
  servers?: Record<string, WebSocketServer & { host?: string; pathname?: string; protocol?: string; description?: string; title?: string }>
  channels: Record<string, AsyncAPIChannel>
  components?: Components
}

type Direction = 'SEND' | 'RECV'

function resolveSchema(schema: Schema | undefined, components: Components): Schema {
  if (!schema) return {}
  if (schema.$ref) {
    const name = schema.$ref.replace(/^#\/components\/schemas\//, '')
    return resolveSchema(components.schemas?.[name], components)
  }
  if (schema.type === 'array' && schema.items) return { ...schema, items: resolveSchema(schema.items, components) }
  if (schema.properties) {
    const properties: Record<string, Schema> = {}
    for (const [key, value] of Object.entries(schema.properties)) properties[key] = resolveSchema(value, components)
    return { ...schema, properties }
  }
  return schema
}

/** Messages an operation carries, with `$ref` and `oneOf` resolved against components. */
function messagesOf(operation: AsyncAPIOperation | undefined, components: Components): AsyncAPIMessage[] {
  if (!operation?.message) return []
  const list = 'oneOf' in operation.message && operation.message.oneOf ? operation.message.oneOf : [operation.message as AsyncAPIMessage]
  return list.map((message) => {
    if (!message.$ref) return message
    const name = message.$ref.replace(/^#\/components\/messages\//, '')
    return { name, ...(components.messages?.[name] ?? {}) }
  })
}

function typeLabel(schema: Schema): string {
  if (schema.enum) return `enum<${schema.type ?? 'string'}>`
  if (schema.type === 'array') return `array<${schema.items ? typeLabel(schema.items) : 'any'}>`
  if (schema.format) return `${schema.type ?? 'string'} · ${schema.format}`
  return schema.type ?? 'object'
}

/**
 * WebSocket operation page: a numbered "Connect" section with the live panel,
 * a "Message types" table (SEND for publish, RECV for subscribe) and the payload fields.
 */
export function AsyncAPI({
  asyncAPIJson,
  channel: selectedChannel,
  operation: selectedOperation,
}: {
  asyncAPIJson: AsyncAPIJson
  channel: string
  operation: 'subscribe' | 'publish'
}) {
  const { channels, components = {}, servers } = asyncAPIJson
  const channel = channels[selectedChannel]
  const operation = channel?.[selectedOperation]
  if (!channel || !operation) return null

  const wsServers: WebSocketServer[] = servers
    ? Object.entries(servers).map(([key, server]) => ({
        url: `${server.protocol}://${server.host}${server.pathname || ''}`,
        description: server.description || server.title || key,
        protocol: server.protocol,
      }))
    : []

  const rows: Array<{ name: string; direction: Direction; description?: string }> = [
    ...messagesOf(channel.publish, components).map((m) => ({ name: m.name ?? m.title ?? 'message', direction: 'SEND' as Direction, description: m.summary ?? m.description })),
    ...messagesOf(channel.subscribe, components).map((m) => ({ name: m.name ?? m.title ?? 'message', direction: 'RECV' as Direction, description: m.summary ?? m.description })),
  ]
  const primary = messagesOf(operation, components)[0]
  const payload = primary?.payload ? resolveSchema(primary.payload, components) : undefined
  const headerExample = primary?.headers ? resolveSchema(primary.headers, components) : undefined
  const defaultHeaders: Record<string, string> = {}
  for (const [name, schema] of Object.entries(headerExample?.properties ?? {})) {
    if (schema.example !== undefined) defaultHeaders[name] = String(schema.example)
  }

  return (
    <div className="dory-asyncapi max-w-none w-full">
      {(operation.description || operation.summary) && <p className="dory-lead -mt-4! mb-6">{operation.description || operation.summary}</p>}

      <h2 id="connect" className="dory-h2 font-heading mb-3 mt-10"><span>Connect</span></h2>
      <WebSocketPanel url={channel.address ?? selectedChannel} servers={wsServers} headers={defaultHeaders} />

      {rows.length > 0 && (
        <>
          <h2 id="message-types" className="dory-h2 font-heading mb-3 mt-10"><span>Message types</span></h2>
          <Table>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Dir</Th>
                <Th>Description</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.direction}-${row.name}`}>
                  <Td><span className="font-mono text-[13px] text-foreground">{row.name}</span></Td>
                  <Td>
                    <span className={row.direction === 'SEND' ? 'font-mono text-xs font-semibold text-[var(--brand-readable,#b65401)]' : 'font-mono text-xs font-semibold text-[var(--primary)]'}>
                      {row.direction}
                    </span>
                  </Td>
                  <Td>{row.description}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      {payload?.properties && (
        <>
          <h2 id="payload" className="dory-h2 font-heading mb-3 mt-10"><span>Payload</span></h2>
          {primary?.contentType && <p className="-mt-2 mb-2 font-mono text-xs text-muted-foreground">{primary.contentType}</p>}
          <Properties>
            {Object.entries(payload.properties).map(([name, schema]) => (
              <Property key={name} name={name} type={typeLabel(schema)} required={payload.required?.includes(name)} defaultValue={schema.default}>
                {schema.description}
              </Property>
            ))}
          </Properties>
        </>
      )}
    </div>
  )
}
