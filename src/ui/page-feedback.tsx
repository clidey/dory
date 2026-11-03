import { useEffect, useState } from 'preact/hooks'
import { captureDocsEvent } from '../utils/analytics'

/**
 * "Was this page helpful?" prompt and a small page engagement signal.
 */
export function PageFeedbackView({ pathname, onAnswer }: { pathname: string; onAnswer: (helpful: boolean) => void }) {
  const [answered, setAnswered] = useState(false)

  useEffect(() => setAnswered(false), [pathname])

  const answer = (helpful: boolean) => {
    onAnswer(helpful)
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

export function PageFeedback({ pathname }: { pathname: string }) {

  useEffect(() => {
    let visibleSeconds = 0
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      visibleSeconds += 1
      if (visibleSeconds === 15) {
        captureDocsEvent('docs_page_engaged', { path: pathname, active_seconds: 15 })
        window.clearInterval(timer)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [pathname])

  return <PageFeedbackView pathname={pathname} onAnswer={helpful => captureDocsEvent('docs_page_feedback', { path: pathname, helpful })} />
}
