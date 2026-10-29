import { describe, it, expect } from 'vitest'
import { formatTime } from './timer.ts'

describe('formatTime', () => {
  it('shows zero as 0:00', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('pads single-digit seconds with a zero', () => {
    expect(formatTime(65)).toBe('1:05')
  })

  it('shows a full hour as 60:00', () => {
    expect(formatTime(3600)).toBe('60:00')
  })
})
