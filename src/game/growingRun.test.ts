import { describe, it, expect } from 'vitest'
import { advanceRun, isRunDone, startRun } from './growingRun.ts'

const T0 = 1_000_000

describe('startRun', () => {
  it('starts a fresh seed from zero at the current time', () => {
    expect(startRun('glowcap', T0)).toEqual({
      speciesId: 'glowcap',
      elapsedSeconds: 0,
      weatherSeconds: {},
      slotIndex: null,
      lastTickAt: T0,
    })
  })

  it('carries on from a resumed sprout', () => {
    const run = startRun('veilvine', T0, { elapsedSeconds: 600, weatherSeconds: { rainy: 600 }, slotIndex: 3 })
    expect(run.elapsedSeconds).toBe(600)
    expect(run.weatherSeconds).toEqual({ rainy: 600 })
    expect(run.slotIndex).toBe(3)
  })
})

describe('advanceRun', () => {
  it('adds the real time passed since the last update', () => {
    const run = advanceRun(startRun('glowcap', T0), T0 + 250, 1, 'clear')
    expect(run.elapsedSeconds).toBeCloseTo(0.25)
    expect(run.lastTickAt).toBe(T0 + 250)
  })

  it('catches up after the phone was locked for a long time', () => {
    const run = advanceRun(startRun('glowcap', T0), T0 + 20 * 60_000, 1, 'rainy')
    expect(run.elapsedSeconds).toBe(20 * 60)
    expect(run.weatherSeconds).toEqual({ rainy: 20 * 60 })
  })

  it('credits the time to the weather right now', () => {
    let run = startRun('glowcap', T0)
    run = advanceRun(run, T0 + 60_000, 1, 'clear')
    run = advanceRun(run, T0 + 90_000, 1, 'rainy')
    expect(run.weatherSeconds).toEqual({ clear: 60, rainy: 30 })
  })

  it('speeds up time for the dev speed shortcuts', () => {
    expect(advanceRun(startRun('glowcap', T0), T0 + 1_000, 20, 'clear').elapsedSeconds).toBe(20)
  })

  it('never goes backwards if the clock jumps back', () => {
    const run = advanceRun(startRun('glowcap', T0), T0 - 5_000, 1, 'clear')
    expect(run.elapsedSeconds).toBe(0)
    expect(run.lastTickAt).toBe(T0 - 5_000)
  })
})

describe('isRunDone', () => {
  it('is done once the seed has grown for its full length', () => {
    const run = startRun('glowcap', T0)
    expect(isRunDone(advanceRun(run, T0 + 14 * 60_000, 1, 'clear'))).toBe(false)
    expect(isRunDone(advanceRun(run, T0 + 15 * 60_000, 1, 'clear'))).toBe(true)
  })
})
