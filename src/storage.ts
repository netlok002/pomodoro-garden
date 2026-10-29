import type { Garden, Plant } from './garden.ts'
import type { Book } from './book.ts'
import type { WeatherOverride } from './weather.ts'

const STORAGE_KEY = 'pomodoro-garden'

export interface StoredState {
  garden: Garden
  book: Book
  weatherOverride: WeatherOverride | null
  lastSeen: number
}

// Older saves predate weather, so their plants lack the perfect flag or weather tally.
function withDefaults(plant: Plant): Plant {
  if (plant.kind === 'flower') return { ...plant, perfect: plant.perfect ?? false }
  return { ...plant, weatherSeconds: plant.weatherSeconds ?? {} }
}

export function parseState(raw: string | null, now: number): StoredState {
  const fresh: StoredState = { garden: [], book: {}, weatherOverride: null, lastSeen: now }
  if (!raw) return fresh
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.garden)) return fresh
    return {
      garden: parsed.garden.map(withDefaults),
      book: typeof parsed.book === 'object' && parsed.book !== null ? parsed.book : {},
      weatherOverride: parsed.weatherOverride ?? null,
      lastSeen: parsed.lastSeen ?? now,
    }
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
