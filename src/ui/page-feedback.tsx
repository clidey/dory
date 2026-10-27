import { useEffect, useState } from 'preact/hooks'

declare global {
  interface Window {
    posthog?: { capture: (event: string, properties?: Record<string, unknown>) => void }
  }
}

/**
 * "Was this page helpful?" prompt. Answers are sent to PostHog as
 * `docs_page_feedback` when analytics is configured.
 */
export function PageFeedback({ pathname }: { pathname: string }) {
  const [answered, setAnswered] = useState(false)

  useEffect(() => setAnswered(false), [pathname])

  const answer = (helpful: boolean) => {
    window.posthog?.capture('docs_page_feedback', { path: pathname, helpful })
    setAnswered(true)
  }

  return (
    <div className="dory-feedback mt-16 flex items-center justify-between border-y border-[var(--border)] py-4">
      {answered ? (
        <p className="text-sm text-muted-foreground" role="status">Thanks for the feedback.</p>
      ) : (
        <>
          <p className="text-sm font-medium text-foreground">Was this page helpful?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => answer(true)}>Yes</button>
            <button type="button" onClick={() => answer(false)}>No</button>
          </div>
        </>
      )}
    </div>
  )
}
