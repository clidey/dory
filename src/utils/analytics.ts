declare global {
  interface Window {
    posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void }
  }
}

type DocsEvent =
  | 'docs_search'
  | 'docs_search_result_clicked'
  | 'docs_page_feedback'
  | 'docs_code_copied'
  | 'docs_page_engaged'
  | 'docs_chat_opened'
  | 'docs_chat_question'
  | 'docs_chat_answer'
  | 'docs_chat_answer_copied'
  | 'docs_chat_code_copied'
  | 'docs_chat_error'
  | 'docs_chat_source_clicked'

/** Search text may contain credentials or personal data typed by mistake. */
function sanitizeQuery(value: string): string {
  return value.trim().slice(0, 160)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\b(?:Bearer\s+\S+|sk-[A-Za-z0-9_-]{12,}|(?:api[\s_-]?key|token|password|secret)\s*[:=]\s*\S+)/gi, '[redacted]')
}

/** Sends a small event to the configured PostHog project. */
export function captureDocsEvent(event: DocsEvent, properties: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  const safeProperties = { ...properties }
  if (typeof safeProperties.query === 'string') safeProperties.query = sanitizeQuery(safeProperties.query)
  try { window.posthog?.capture(event, safeProperties) }
  catch { /* Analytics must not interrupt reading. */ }
}
