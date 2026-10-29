import { describe, it, expect } from 'vitest'
import { bloomStageFor, growthStage, stageName } from './growth.ts'

const FIFTEEN_MINUTES = 15 * 60

describe('growthStage', () => {
  it('starts a fresh seed at stage 0', () => {
    expect(growthStage(0, FIFTEEN_MINUTES)).toBe(0)
  })

  it('moves up one stage every 5 minutes', () => {
    expect(growthStage(299, FIFTEEN_MINUTES)).toBe(0)
    expect(growthStage(300, FIFTEEN_MINUTES)).toBe(1)
    expect(growthStage(600, FIFTEEN_MINUTES)).toBe(2)
  })

  it('stops at the bloom stage, which depends on the seed length', () => {
    expect(growthStage(900, FIFTEEN_MINUTES)).toBe(3)
    expect(growthStage(1200, FIFTEEN_MINUTES)).toBe(3)
    expect(growthStage(60 * 60, 60 * 60)).toBe(12)
  })
})

describe('stageName', () => {
  it('names the first stage seed and the last stage bloom', () => {
    expect(stageName(0, 3)).toBe('seed')
    expect(stageName(3, 3)).toBe('bloom')
    expect(stageName(12, 12)).toBe('bloom')
  })

  it('spreads the middle stages across sprout, stem and bud', () => {
    const sixtyMinuteNames = Array.from({ length: 13 }, (_, stage) => stageName(stage, 12))
    expect(sixtyMinuteNames).toEqual([
      'seed',
      'sprout', 'sprout', 'sprout', 'sprout',
      'stem', 'stem', 'stem', 'stem',
      'bud', 'bud', 'bud',
      'bloom',
    ])
  })

  it('gives a 15 minute seed a sprout and a stem before it blooms', () => {
    expect(stageName(1, 3)).toBe('sprout')
    expect(stageName(2, 3)).toBe('stem')
  })
})

describe('bloomStageFor', () => {
  it('gives one stage per 5 minutes of seed length', () => {
    expect(bloomStageFor(15 * 60)).toBe(3)
    expect(bloomStageFor(60 * 60)).toBe(12)
  })
})
