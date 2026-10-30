import { describe, it, expect } from 'vitest'
import { escapeHtml } from './html.ts'

describe('escapeHtml', () => {
  it('turns HTML special characters into harmless text', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#39;s')
  })

  it('leaves ordinary text alone', () => {
    expect(escapeHtml('Española, NM')).toBe('Española, NM')
  })
})
