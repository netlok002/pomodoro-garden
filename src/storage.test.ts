import { describe, it, expect } from 'vitest'
import { parseState } from './storage.ts'

const NOW = 1_000_000
const FRESH = { garden: [], book: {}, weatherOverride: null, lastSeen: NOW }

describe('parseState', () => {
  it('starts with an empty garden and book when nothing is saved', () => {
    expect(parseState(null, NOW)).toEqual(FRESH)
  })

  it('restores a saved garden, book and weather override', () => {
    const saved = {
      garden: [
        { kind: 'flower', speciesId: 'glowcap', perfect: true },
        { kind: 'sprout', speciesId: 'veilvine', elapsedSeconds: 600, weatherSeconds: { rainy: 600 } },
      ],
      book: { murkmoss: { normal: { count: 2, firstFound: '2026-10-29' } } },
      weatherOverride: { date: '2026-10-29', weather: 'clear' },
      lastSeen: 500,
    }
    expect(parseState(JSON.stringify(saved), NOW)).toEqual(saved)
  })

  it('fills in what older saves are missing', () => {
    const saved = {
      garden: [
        { kind: 'flower', speciesId: 'glowcap' },
        { kind: 'sprout', speciesId: 'veilvine', elapsedSeconds: 600 },
      ],
      lastSeen: 500,
    }
    expect(parseState(JSON.stringify(saved), NOW)).toEqual({
      garden: [
        { kind: 'flower', speciesId: 'glowcap', perfect: false },
        { kind: 'sprout', speciesId: 'veilvine', elapsedSeconds: 600, weatherSeconds: {} },
      ],
      book: {},
      weatherOverride: null,
      lastSeen: 500,
    })
  })

  it('starts fresh when the save is broken', () => {
    expect(parseState('{not json', NOW)).toEqual(FRESH)
  })

  it('starts fresh when the save has no garden', () => {
    expect(parseState(JSON.stringify({ xp: 12, lastSeen: 500 }), NOW)).toEqual(FRESH)
  })
})
