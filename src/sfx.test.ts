import { describe, it, expect } from 'vitest'
import { pageFlipPlan, randomizedPitch } from './sfx.ts'

describe('randomizedPitch', () => {
  it('returns the base pitch at the middle of the random range', () => {
    expect(randomizedPitch(800, 1.5, () => 0.5)).toBeCloseTo(800)
  })

  it('goes at most the given number of semitones down or up', () => {
    const semitone = 2 ** (1 / 12)
    expect(randomizedPitch(800, 1, () => 0)).toBeCloseTo(800 / semitone)
    expect(randomizedPitch(800, 1, () => 1)).toBeCloseTo(800 * semitone)
  })

  it('gives different pitches for different random values', () => {
    expect(randomizedPitch(800, 1.5, () => 0.2)).not.toBeCloseTo(randomizedPitch(800, 1.5, () => 0.8))
  })
})

describe('pageFlipPlan', () => {
  it('plans the requested number of flips', () => {
    expect(pageFlipPlan(3)).toHaveLength(3)
  })

  it('keeps every flip within its ranges', () => {
    for (const flip of pageFlipPlan(20)) {
      expect(flip.duration).toBeGreaterThanOrEqual(0.07)
      expect(flip.duration).toBeLessThanOrEqual(0.14)
      expect(flip.brightness).toBeGreaterThanOrEqual(1600)
      expect(flip.brightness).toBeLessThanOrEqual(3200)
    }
  })

  it('spaces the flips out one after another', () => {
    const delays = pageFlipPlan(4).map((flip) => flip.delay)
    expect(delays[0]).toBe(0)
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThan(delays[i - 1])
    }
  })

  it('varies from flip to flip', () => {
    const [first, second] = pageFlipPlan(2, (() => { let n = 0; return () => [0.1, 0.9][n++ % 2] })())
    expect(first.brightness).not.toBe(second.brightness)
  })
})
