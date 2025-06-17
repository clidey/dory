import { useState } from "preact/hooks"
import { APIGroup } from "./api"
import { APIPlayground, PlayButton } from "./api-playground"
import { Fence } from "./fence"
import { Tag } from "./tag"
import { Col, Row } from "./text"
import { motion } from "motion/react"

export function Properties({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-2">
      <ul
        role="list"
        className="m-0 max-w-[calc(var(--container-lg)-(--spacing(8)))] list-none divide-y divide-zinc-900/5 p-0 dark:divide-white/10"
      >
        {children}
      </ul>
    </div>
  )
}

export function Property({
  name,
  children,
  type,
  required = false,
}: {
  name: string
  children: React.ReactNode
  type?: string
  required?: boolean
}) {
  return (
    <div className="m-0 px-0 first:pt-0 last:pb-0">
      <div className="my-4 flex flex-wrap items-center gap-x-3 gap-2">
        <Tag className="px-4 py-1">{name}</Tag>
        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
          {type}
        </p>
        {required && <span className="text-rose-400 ml-1 text-xs">Required</span>}
        <p className="w-full flex-none [&>:first-child]:mt-0 [&>:last-child]:mb-0 text-sm">
          {children}
        </p>
      </div>
    </div>
  )
}


interface ParamFieldProps {
  body: string;
  type: string;
  default?: string | number;
  required?: boolean;
  children: React.ReactNode;
}

export function ParamField({ body, type, default: defaultValue, required, children }: ParamFieldProps) {
  return (
    <Property name={body} type={type} required={required}>
      {children}
      {defaultValue != null && (
        <span className="text-gray-500 ml-1">(default: {defaultValue})</span>
      )}
    </Property>
  );
}

interface ResponseFieldProps {
  name: string;
  type: string;
  required?: boolean;
  children: React.ReactNode;
}

export function ResponseField({ name, type, required, children }: ResponseFieldProps) {
  return (
    <Property name={name} type={type} required={required}>
      {children}
    </Property>
  );
}

interface Schema {
  $ref?: string;
  type?: string;
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: boolean;
  description?: string;
  default?: string | number;
}

interface Components {
  schemas?: Record<string, Schema>;
}

interface Parameter {
  name: string;
  schema?: Schema;
  required?: boolean;
  description?: string;
}

interface Content {
  schema?: Schema;
}

interface RequestBody {
  description?: string;
  content?: {
    'application/json'?: Content;
  };
}

interface Response {
  content?: {
    'application/json'?: Content;
  };
}

interface PathMethod {
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
}

export interface OpenAPIJson {
  paths: Record<string, Record<string, PathMethod>>;
  components: Components;
}

function resolveSchema(schema: Schema | undefined, components: Components): Schema {
  if (!schema) return {};

  if (schema.$ref) {
    const refPath = schema.$ref.replace(/^#\/components\/schemas\//, '');
    return resolveSchema(components.schemas?.[refPath], components);
  }

  if (schema.type === 'array' && schema.items) {
    return {
      ...schema,
      items: resolveSchema(schema.items, components)
    };
  }

  if (schema.properties) {
    const resolvedProps: Record<string, Schema> = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      resolvedProps[key] = resolveSchema(value, components);
    }
    return {
      ...schema,
      properties: resolvedProps
    };
  }

  return schema;
}

export function OpenAPI({ openAPIJson, method: selectedMethod, path: selectedPath }: { openAPIJson: OpenAPIJson, method: string, path: string }) {
  const { paths, components } = openAPIJson;
  const [showPlayground, setShowPlayground] = useState(false);

  const handleShowPlayground = () => {
    setShowPlayground(true);
  }

  return (
    <div className="max-w-none w-full">
      {
        showPlayground &&
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed inset-y-0 right-0 w-full max-w-3xl bg-white dark:bg-[#1e1e1e] shadow-xl z-50 overflow-y-auto border-l border-zinc-200 dark:border-zinc-800"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">API Playground</h2>
              <button
                onClick={() => setShowPlayground(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <APIPlayground
              method={selectedMethod}
              url={selectedPath}
              baseUrl="https://api.example.com"
            />
          </div>
        </motion.div>
      }

      {Object.entries(paths).map(([path, methods]) => {
        if (path !== selectedPath) {
          return null;
        }

        return (
          <div key={path} className="my-8">
            {Object.entries(methods).map(([method, details]) => {
            const { description, parameters, requestBody, responses } = details;
            const methodUpper = method.toUpperCase();

            if (methodUpper !== selectedMethod) {
              return null;
            }

            return (
              <Row key={`${method}-${path}`} cols={2}>
                <Col>
                  <h2 className="flex items-center mt-4">
                    <Tag variant="medium" className="mr-2 py-1 px-4 rounded-lg">{methodUpper}</Tag>
                    <span className="ml-2 font-mono">{path}</span>
                  </h2>

                  {description && <p>{description}</p>}

                  {parameters && parameters.length > 0 && (
                    <div className="mt-4">
                      <h3>Parameters</h3>
                      <Properties>
                        {parameters.map((param) => (
                          <ParamField 
                            key={param.name}
                            body={param.name}
                            type={param.schema?.type ?? 'string'}
                            required={param.required}
                            default={param.schema?.default}
                          >
                            {param.description}
                          </ParamField>
                        ))}
                      </Properties>
                    </div>
                  )}
                  {requestBody && (
                    <div className="mt-4">
                      <h3>Request Body</h3>
                      <p>{requestBody.description}</p>
                      {requestBody.content?.['application/json']?.schema && (
                        (() => {
                          const resolvedSchema = resolveSchema(requestBody.content['application/json'].schema, components);
                          return (
                            <Properties>
                              {Object.entries(resolvedSchema.properties || {}).map(([propName, prop]) => (
                                <ParamField
                                  key={propName}
                                  body={propName}
                                  type={prop.type ?? 'string'}
                                  required={prop.required}
                                  default={prop.default}
                                >
                                  {prop.description}
                                </ParamField>
                              ))}
                            </Properties>
                          );
                        })()
                      )}
                    </div>
                  )}
                  {components?.schemas && (
                    <div>
                      <h3>Schemas</h3>
                      {Object.entries(components.schemas).filter(([, schema]) => schema.properties).map(([name, schema]) => (
                        <div key={name} className="mt-4">
                          <h4>{name}</h4>
                          <Properties>
                            {Object.entries(schema.properties || {}).map(([propName, prop]) => (
                              <ResponseField
                                key={propName}
                                name={propName}
                                type={prop.type ?? 'string'}
                                required={prop.required}
                              >
                                {prop.description}
                              </ResponseField>
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
                    className='ml-auto mt-3 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition bg-sky-600 text-white hover:bg-sky-700'>
                      Try
                    <PlayButton className="h-4 w-4" />
                  </button>
                  <APIGroup title="Request" tag={methodUpper} label={path}>
                    {Object.entries(responses).map(([code, response]) => (
                      <div key={code} title={code}>
                        {response.content?.['application/json']?.schema && (() => {
                          const resolvedSchema = resolveSchema(response.content['application/json'].schema, components);
                          return (
                            <Fence language="json">
                                {JSON.stringify(resolvedSchema, null, 2)}
                            </Fence>
                          );
                        })()}
                      </div>
                    ))}
                  </APIGroup>
                </Col>
              </Row>
            )
          })}
          </div>
        )
      })}
    </div>
  )
}
