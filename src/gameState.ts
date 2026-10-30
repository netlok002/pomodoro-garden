// The saved game in one place: read it with `current`, change it with `update`, and
// every change is saved straight away. Loading and saving are passed in so tests can
// stand in for localStorage.
import { loadState, saveState, type StoredState } from './storage.ts'

export type GameChanges = Partial<Omit<StoredState, 'lastSeen'>>

export interface GameState {
  readonly current: StoredState
  update: (changes: GameChanges) => void
  replace: (next: StoredState) => void
}

export function createGameState(
  load: () => StoredState = loadState,
  persist: (state: StoredState) => void = saveState,
): GameState {
  let state = load()

  const commit = (next: StoredState) => {
    state = { ...next, lastSeen: Date.now() }
    persist(state)
  }

  return {
    get current() {
      return state
    },
    update: (changes) => commit({ ...state, ...changes }),
    replace: (next) => commit(next),
  }
}
