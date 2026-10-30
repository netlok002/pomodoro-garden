import { describe, it, expect } from 'vitest'
import { decodeSave, encodeSave } from './saveCode.ts'
import { parseState, type StoredState } from './storage.ts'

const NOW = 1_000_000

const state: StoredState = {
  garden: [null, null, { kind: 'flower', speciesId: 'glowcap', perfect: true }, null, null],
  book: { murkmoss: { normal: { count: 2, firstFound: '2026-10-29' } } },
  weatherOverride: null,
  pendingBloom: null,
  place: { zip: '87532', name: 'Española', state: 'NM', latitude: 35.99, longitude: -106.08 },
  forecastCache: null,
  growing: null,
  lastSeen: 500,
}

describe('save codes', () => {
  it('round-trips a save, including non-English place names', () => {
    expect(decodeSave(encodeSave(state), NOW)).toEqual(state)
  })

  it('starts with a recognisable prefix and contains no spaces', () => {
    const code = encodeSave(state)
    expect(code.startsWith('GARDEN1.')).toBe(true)
    expect(code).not.toMatch(/\s/)
  })

  it('ignores spaces and line breaks picked up while copying', () => {
    const code = encodeSave(state)
    const messy = `  ${code.slice(0, 20)}\n${code.slice(20)}  `
    expect(decodeSave(messy, NOW)).toEqual(state)
  })

  it('rejects text that is not a save code', () => {
    expect(decodeSave('', NOW)).toBeNull()
    expect(decodeSave('hello garden', NOW)).toBeNull()
    expect(decodeSave('GARDEN1.not-base64!!', NOW)).toBeNull()
    expect(decodeSave(`GARDEN1.${btoa('{"no":"garden"}')}`, NOW)).toBeNull()
  })

  it('cleans a loaded save the same way as a normal load', () => {
    const code = encodeSave(state)
    expect(decodeSave(code, NOW)).toEqual(parseState(JSON.stringify(state), NOW))
  })
})
