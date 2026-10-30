import { describe, it, expect } from 'vitest'
import { localDateKey } from './dates.ts'

describe('localDateKey', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('uses the local day, even late at night', () => {
    expect(localDateKey(new Date(2026, 9, 29, 23, 59))).toBe('2026-10-29')
  })
})
