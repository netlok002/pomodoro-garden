import { describe, it, expect } from 'vitest'
import { parseState } from './storage.ts'

const NOW = 1_000_000
const EMPTY_SLOTS = (count: number) => Array(count).fill(null)
const FRESH = { garden: EMPTY_SLOTS(5), book: {}, weatherOverride: null, pendingBloom: null, place: null, forecastCache: null, growing: null, lastSeen: NOW }

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
      place: { zip: '97201', name: 'Portland', state: 'OR', latitude: 45.5, longitude: -122.7 },
      forecastCache: { date: '2026-10-29', zip: '97201', forecast: { yesterday: 'rainy', today: 'clear', tomorrow: 'overcast' } },
      growing: { speciesId: 'glowcap', elapsedSeconds: 312.5, weatherSeconds: { rainy: 312.5 }, slotIndex: null, lastTickAt: 400 },
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
      place: null,
      forecastCache: null,
      growing: null,
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

describe('parseState cleans untrusted data', () => {
  const load = (save: object) => parseState(JSON.stringify({ lastSeen: 1, ...save }), NOW)
  const glowcap = { kind: 'flower', speciesId: 'glowcap', perfect: false }

  it('empties slots holding unknown species or broken plants', () => {
    const garden = [
      glowcap,
      { kind: 'flower', speciesId: '<img src=x onerror=alert(1)>', perfect: false },
      { kind: 'tree', speciesId: 'glowcap' },
      { kind: 'sprout', speciesId: 'glowcap', elapsedSeconds: 'lots', weatherSeconds: {} },
      'not a plant',
    ]
    expect(load({ garden }).garden).toEqual([glowcap, null, null, null, null])
  })

  it('keeps only known weathers and sensible numbers in a sprout tally', () => {
    const sprout = { kind: 'sprout', speciesId: 'veilvine', elapsedSeconds: 300, weatherSeconds: { rainy: 120, storm: 9, clear: -5 } }
    expect(load({ garden: [sprout] }).garden[0]).toEqual({ ...sprout, weatherSeconds: { rainy: 120 } })
  })

  it('drops book pages for unknown species and malformed entries', () => {
    const book = {
      glowcap: { normal: { count: 2, firstFound: '2026-10-29' }, perfect: { count: 'many', firstFound: '2026-10-29' } },
      '<script>': { normal: { count: 1, firstFound: '2026-10-29' } },
      murkmoss: { normal: { count: 1, firstFound: '<b>today</b>' } },
    }
    expect(load({ garden: [], book }).book).toEqual({ glowcap: { normal: { count: 2, firstFound: '2026-10-29' } } })
  })

  it('drops a weather override with an unknown weather', () => {
    expect(load({ garden: [], weatherOverride: { date: '2026-10-29', weather: 'hail' } }).weatherOverride).toBeNull()
  })

  it('drops a waiting bloom for an unknown species or slot', () => {
    expect(load({ garden: [], pendingBloom: { speciesId: 'nope', perfect: true, slotIndex: 1 } }).pendingBloom).toBeNull()
    expect(load({ garden: [], pendingBloom: { speciesId: 'glowcap', perfect: true, slotIndex: 9 } }).pendingBloom).toBeNull()
  })

  it('drops a place with a bad zip or missing coordinates', () => {
    const portland = { zip: '97201', name: 'Portland', state: 'OR', latitude: 45.5, longitude: -122.7 }
    expect(load({ garden: [], place: portland }).place).toEqual(portland)
    expect(load({ garden: [], place: { ...portland, zip: '97201"><script>' } }).place).toBeNull()
    expect(load({ garden: [], place: { ...portland, latitude: 'north' } }).place).toBeNull()
  })

  it('drops a cached forecast containing unknown weathers', () => {
    const cache = { date: '2026-10-29', zip: '97201', forecast: { yesterday: 'clear', today: 'lava', tomorrow: 'clear' } }
    expect(load({ garden: [], forecastCache: cache }).forecastCache).toBeNull()
  })
})

describe('parseState cleans a saved growing run', () => {
  const load = (growing: unknown) => parseState(JSON.stringify({ garden: [], lastSeen: 1, growing }), NOW).growing
  const run = { speciesId: 'glowcap', elapsedSeconds: 60, weatherSeconds: { clear: 60, lava: 9 }, slotIndex: 2, lastTickAt: 500 }

  it('keeps a valid run, dropping unknown weathers', () => {
    expect(load(run)).toEqual({ ...run, weatherSeconds: { clear: 60 } })
  })

  it('drops a run for an unknown species, a bad slot or a missing clock time', () => {
    expect(load({ ...run, speciesId: 'nope' })).toBeNull()
    expect(load({ ...run, slotIndex: 7 })).toBeNull()
    expect(load({ ...run, lastTickAt: 'soon' })).toBeNull()
  })
})
