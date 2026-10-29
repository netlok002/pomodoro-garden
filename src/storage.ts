import type { Garden } from './garden.ts'
import type { Book } from './book.ts'

const STORAGE_KEY = 'pomodoro-garden'

export interface StoredState {
  garden: Garden
  book: Book
  lastSeen: number
}

export function parseState(raw: string | null, now: number): StoredState {
  const fresh: StoredState = { garden: [], book: {}, lastSeen: now }
  if (!raw) return fresh
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.garden)) return fresh
    const book = typeof parsed.book === 'object' && parsed.book !== null ? parsed.book : {}
    return { garden: parsed.garden, book, lastSeen: parsed.lastSeen ?? now }
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
