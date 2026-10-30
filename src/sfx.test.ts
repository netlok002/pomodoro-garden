import { describe, it, expect } from 'vitest'
import { birdSongPlan, pageFlipPlan, randomizedPitch, tickPlan } from './sfx.ts'

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

describe('tickPlan', () => {
  it('alternates tick and tock at a steady pace', () => {
    const ticks = tickPlan(4)
    expect(ticks.map((tick) => tick.kind)).toEqual(['tick', 'tock', 'tick', 'tock'])
    expect(ticks[1].delay - ticks[0].delay).toBeCloseTo(ticks[3].delay - ticks[2].delay)
  })
})

describe('birdSongPlan', () => {
  const song = birdSongPlan()

  it('is a short song of several chirps', () => {
    expect(song.length).toBeGreaterThanOrEqual(8)
    expect(Math.max(...song.map((chirp) => chirp.delay + chirp.duration))).toBeLessThanOrEqual(2.6)
  })

  it('keeps every chirp in a bird-like pitch range', () => {
    for (const chirp of song) {
      expect(Math.min(chirp.from, chirp.to)).toBeGreaterThanOrEqual(2500)
      expect(Math.max(chirp.from, chirp.to)).toBeLessThanOrEqual(6000)
    }
  })

  it('has rising tweets and falling trill notes', () => {
    expect(song.some((chirp) => chirp.to > chirp.from)).toBe(true)
    expect(song.some((chirp) => chirp.to < chirp.from)).toBe(true)
  })
})
