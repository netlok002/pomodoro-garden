import { describe, it, expect } from 'vitest'
import { createGameState } from './gameState.ts'
import { emptyGarden } from './garden.ts'
import type { StoredState } from '../save/storage.ts'

const saved: StoredState = {
  garden: emptyGarden(),
  book: {},
  weatherOverride: null,
  pendingBloom: null,
  place: null,
  forecastCache: null,
  growing: null,
  lastSeen: 1,
}

// Starts from `saved` and records every save instead of touching localStorage.
const setup = () => {
  const writes: StoredState[] = []
  const game = createGameState(() => saved, (state) => writes.push(state))
  return { game, writes }
}

describe('createGameState', () => {
  it('starts from the saved game', () => {
    expect(setup().game.current).toEqual(saved)
  })

  it('saves every change, stamping when it happened', () => {
    const { game, writes } = setup()
    game.update({ book: { glowcap: { normal: { count: 1, firstFound: '2026-10-30' } } } })
    expect(game.current.book.glowcap.normal?.count).toBe(1)
    expect(writes).toHaveLength(1)
    expect(writes[0].book).toEqual(game.current.book)
    expect(writes[0].lastSeen).toBeGreaterThan(1)
  })

  it('keeps fields that were not changed', () => {
    const { game } = setup()
    game.update({ weatherOverride: { date: '2026-10-30', weather: 'rainy' } })
    expect(game.current.garden).toEqual(saved.garden)
  })

  it('replaces the whole game when a save code is loaded', () => {
    const { game, writes } = setup()
    const loaded = { ...saved, book: { murkmoss: { perfect: { count: 2, firstFound: '2026-10-29' } } } }
    game.replace(loaded)
    expect(game.current.book).toEqual(loaded.book)
    expect(writes).toHaveLength(1)
  })
})
