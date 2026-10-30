import { describe, it, expect } from 'vitest'
import { randomizedPitch } from './sfx.ts'

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
