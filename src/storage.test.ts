import { describe, it, expect } from 'vitest'
import { parseState } from './storage.ts'

const NOW = 1_000_000
const FRESH = { garden: [], book: {}, lastSeen: NOW }

describe('parseState', () => {
  it('starts with an empty garden and book when nothing is saved', () => {
    expect(parseState(null, NOW)).toEqual(FRESH)
  })

  it('restores a saved garden and book', () => {
    const saved = {
      garden: [{ kind: 'flower', speciesId: 'glowcap' }],
      book: { murkmoss: { normal: { count: 2, firstFound: '2026-10-29' } } },
      lastSeen: 500,
    }
    expect(parseState(JSON.stringify(saved), NOW)).toEqual(saved)
  })

  it('gives an older save without a book an empty book', () => {
    const saved = { garden: [{ kind: 'flower', speciesId: 'glowcap' }], lastSeen: 500 }
    expect(parseState(JSON.stringify(saved), NOW)).toEqual({ ...saved, book: {} })
  })

  it('starts fresh when the save is broken', () => {
    expect(parseState('{not json', NOW)).toEqual(FRESH)
  })

  it('starts fresh when the save has no garden', () => {
    expect(parseState(JSON.stringify({ xp: 12, lastSeen: 500 }), NOW)).toEqual(FRESH)
  })
})
