import { describe, expect, it } from 'vitest'
import { diffBaseLanguage, isTerminalSession, parseFenceMeta } from './fence-meta'

describe('parseFenceMeta', () => {
  it('returns empty meta for no meta string', () => {
    expect(parseFenceMeta()).toEqual({ highlight: new Set() })
  })

  it('reads a bare filename and highlighted line ranges', () => {
    const meta = parseFenceMeta('dory.json {1,4-6}')
    expect(meta.title).toBe('dory.json')
    expect([...meta.highlight]).toEqual([1, 4, 5, 6])
  })

  it('reads key="value" pairs', () => {
    const meta = parseFenceMeta('tag="GET" label="/api/users" title="List users"')
    expect(meta).toMatchObject({ tag: 'GET', label: '/api/users', title: 'List users' })
  })

  it('prefers an explicit title over bare text', () => {
    expect(parseFenceMeta('ignored title="Kept"').title).toBe('Kept')
  })
})

describe('diffBaseLanguage', () => {
  it('detects plain and language diffs', () => {
    expect(diffBaseLanguage('diff')).toBe('')
    expect(diffBaseLanguage('diff-json')).toBe('json')
    expect(diffBaseLanguage('json')).toBeNull()
  })
})

describe('isTerminalSession', () => {
  it('needs a shell language and a $ prompt', () => {
    expect(isTerminalSession('sh', '$ dory dev\n✓ Compiled')).toBe(true)
    expect(isTerminalSession('bash', 'echo hi')).toBe(false)
    expect(isTerminalSession('json', '$ not shell')).toBe(false)
  })
})
