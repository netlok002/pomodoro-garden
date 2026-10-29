import type { Garden } from './garden.ts'

const STORAGE_KEY = 'pomodoro-garden'

export interface StoredState {
  garden: Garden
  lastSeen: number
}

export function parseState(raw: string | null, now: number): StoredState {
  const fresh: StoredState = { garden: [], lastSeen: now }
  if (!raw) return fresh
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.garden)) return fresh
    return parsed as StoredState
  } catch {
    return fresh
  }
}

export function saveState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function loadState(): StoredState {
  return parseState(localStorage.getItem(STORAGE_KEY), Date.now())
}
