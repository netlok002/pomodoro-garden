const STORAGE_KEY = 'pomodoro-creature'

export interface StoredState {
  xp: number
  lastSeen: number
}

export function saveState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function loadState(): StoredState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return { xp: 0, lastSeen: Date.now() }
  }
  return JSON.parse(raw) as StoredState
}
