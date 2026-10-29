import { describe, it, expect } from 'vitest'
import { parseState } from './storage.ts'

const NOW = 1_000_000

describe('parseState', () => {
  it('starts with an empty garden when nothing is saved', () => {
    expect(parseState(null, NOW)).toEqual({ garden: [], lastSeen: NOW })
  })

  it('restores a saved garden', () => {
    const saved = { garden: [{ kind: 'flower', speciesId: 'glowcap' }], lastSeen: 500 }
    expect(parseState(JSON.stringify(saved), NOW)).toEqual(saved)
  })

  it('starts fresh when the save is broken', () => {
    expect(parseState('{not json', NOW)).toEqual({ garden: [], lastSeen: NOW })
  })

  it('starts fresh when the save has no garden', () => {
    expect(parseState(JSON.stringify({ xp: 12, lastSeen: 500 }), NOW)).toEqual({ garden: [], lastSeen: NOW })
  })
})
