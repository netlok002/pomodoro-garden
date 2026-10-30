import { GARDEN_CAPACITY, PLANTING_ORDER, emptyGarden, type Garden, type Plant } from './garden.ts'
import { recordPick, type Book } from './book.ts'
import { localDateKey } from './dates.ts'
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

// Lays a saved row into the fixed slots. A row that fits keeps its exact positions;
// a longer row (from when the garden was bigger) is replanted middle-out, and flowers that
// no longer fit are pressed into the book so nothing the player grew is lost.
function toSlots(saved: (Plant | null)[], book: Book, today: string): { garden: Garden; book: Book } {
  if (saved.length <= GARDEN_CAPACITY) {
    const garden = emptyGarden().map((_, index) => {
      const plant = saved[index]
      return plant ? withDefaults(plant) : null
    })
    return { garden, book }
  }

  const plants = saved.filter((plant): plant is Plant => plant !== null).map(withDefaults)
  const garden = emptyGarden()
  plants.slice(0, GARDEN_CAPACITY).forEach((plant, i) => (garden[PLANTING_ORDER[i]] = plant))
  const overflowBook = plants
    .slice(GARDEN_CAPACITY)
    .reduce(
      (updated, plant) =>
        plant.kind === 'flower'
          ? recordPick(updated, plant.speciesId, plant.perfect ? 'perfect' : 'normal', today)
          : updated,
      book,
    )
  return { garden, book: overflowBook }
}

export function parseState(raw: string | null, now: number): StoredState {
  const fresh: StoredState = { garden: emptyGarden(), book: {}, weatherOverride: null, lastSeen: now }
  if (!raw) return fresh
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.garden)) return fresh
    const savedBook: Book = typeof parsed.book === 'object' && parsed.book !== null ? parsed.book : {}
    const { garden, book } = toSlots(parsed.garden, savedBook, localDateKey(new Date(now)))
    return {
      garden,
      book,
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
