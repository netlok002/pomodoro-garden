import { describe, it, expect } from 'vitest'
import { parseState } from './storage.ts'

const NOW = 1_000_000
const EMPTY_SLOTS = (count: number) => Array(count).fill(null)
const FRESH = { garden: EMPTY_SLOTS(5), book: {}, weatherOverride: null, pendingBloom: null, lastSeen: NOW }

describe('parseState', () => {
  it('starts with an empty garden and book when nothing is saved', () => {
    expect(parseState(null, NOW)).toEqual(FRESH)
  })

  it('restores a saved garden with its gaps, book and weather override', () => {
    const saved = {
      garden: [
        { kind: 'flower', speciesId: 'glowcap', perfect: true },
        null,
        { kind: 'sprout', speciesId: 'veilvine', elapsedSeconds: 600, weatherSeconds: { rainy: 600 } },
        ...EMPTY_SLOTS(2),
      ],
      book: { murkmoss: { normal: { count: 2, firstFound: '2026-10-29' } } },
      weatherOverride: { date: '2026-10-29', weather: 'clear' },
      pendingBloom: { speciesId: 'glowcap', perfect: true, slotIndex: 1 },
      lastSeen: 500,
    }
    expect(parseState(JSON.stringify(saved), NOW)).toEqual(saved)
  })

  it('fills in what older saves are missing, padding the garden to 5 slots', () => {
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
        ...EMPTY_SLOTS(3),
      ],
      book: {},
      weatherOverride: null,
      pendingBloom: null,
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

describe('parseState with more plants than slots', () => {
  const NOON = new Date(2026, 9, 30, 12).getTime()
  const glowcap = { kind: 'flower', speciesId: 'glowcap', perfect: false }
  const perfectMoss = { kind: 'flower', speciesId: 'murkmoss', perfect: true }
  const sprout = { kind: 'sprout', speciesId: 'veilvine', elapsedSeconds: 60, weatherSeconds: {} }

  it('keeps the first five plants, packing out gaps', () => {
    const saved = { garden: [glowcap, null, glowcap, glowcap, glowcap, glowcap, perfectMoss], lastSeen: 1 }
    expect(parseState(JSON.stringify(saved), NOON).garden).toEqual([glowcap, glowcap, glowcap, glowcap, glowcap])
  })

  it('presses flowers that no longer fit into the book', () => {
    const saved = { garden: [glowcap, glowcap, glowcap, glowcap, glowcap, glowcap, perfectMoss, sprout], lastSeen: 1 }
    expect(parseState(JSON.stringify(saved), NOON).book).toEqual({
      glowcap: { normal: { count: 1, firstFound: '2026-10-30' } },
      murkmoss: { perfect: { count: 1, firstFound: '2026-10-30' } },
    })
  })
})
