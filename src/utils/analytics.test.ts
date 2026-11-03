import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('documentation analytics delivery', () => {
  beforeEach(() => vi.resetModules())
  afterEach(() => vi.unstubAllGlobals())

  it('sends a redacted search query to PostHog without contacting a Dory server', async () => {
    const capture = vi.fn()
    const fetch = vi.fn()
    vi.stubGlobal('window', { posthog: { capture } })
    vi.stubGlobal('fetch', fetch)
    const { captureDocsEvent } = await import('./analytics')

    captureDocsEvent('docs_search', { query: 'api key=short123 email me@example.com', result_count: 0, path: '/intro' })
    expect(capture).toHaveBeenCalledOnce()
    expect(capture).toHaveBeenCalledWith('docs_search', expect.objectContaining({
      query: expect.not.stringContaining('short123'),
      result_count: 0,
      path: '/intro',
    }))
    expect(capture.mock.calls[0][1].query).not.toContain('me@example.com')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not require a Dory analytics server', async () => {
    const capture = vi.fn()
    const fetch = vi.fn()
    vi.stubGlobal('window', { posthog: { capture } })
    vi.stubGlobal('fetch', fetch)
    const { captureDocsEvent } = await import('./analytics')

    captureDocsEvent('docs_code_copied', { path: '/intro' })
    expect(capture).toHaveBeenCalledOnce()
    expect(fetch).not.toHaveBeenCalled()
  })
})
