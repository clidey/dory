import { describe, expect, it } from 'vitest'
import { resolveIconName } from './icon-names'

describe('MDX icon name compatibility', () => {
  it('keeps source-prefixed variants distinct from the default icon', () => {
    expect(resolveIconName('chevron-down')).toBe('chevron-down')
    expect(resolveIconName('enterprise/chevron-down')).toBe('chevron-down-alt-2')
  })

  it('preserves legacy document names', () => {
    expect(resolveIconName('Search')).toBe('search')
    expect(resolveIconName('alert-triangle')).toBe('warning')
    expect(resolveIconName('sparkles')).toBe('ai')
    expect(resolveIconName('line-chart')).toBe('chart')
  })
})
