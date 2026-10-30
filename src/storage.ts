import { GARDEN_CAPACITY, PLANTING_ORDER, emptyGarden, type Garden, type PendingBloom, type Plant } from './garden.ts'
import { recordPick, type Book } from './book.ts'
import { localDateKey } from './dates.ts'
import type { WeatherOverride } from './weather.ts'
import type { CachedForecast, Place } from './realWeather.ts'
import { cleanBook, cleanForecastCache, cleanOverride, cleanPendingBloom, cleanPlace, cleanPlant } from './cleanSave.ts'

const STORAGE_KEY = 'pomodoro-garden'

export interface StoredState {
  garden: Garden
  book: Book
  weatherOverride: WeatherOverride | null
  pendingBloom: PendingBloom | null
  place: Place | null
  forecastCache: CachedForecast | null
  lastSeen: number
}

// Lays a saved row into the fixed slots. A row that fits keeps its exact positions;
// a longer row (from when the garden was bigger) is replanted middle-out, and flowers that
// no longer fit are pressed into the book so nothing the player grew is lost.
function toSlots(saved: unknown[], book: Book, today: string): { garden: Garden; book: Book } {
  const plants = saved.map(cleanPlant)
  if (plants.length <= GARDEN_CAPACITY) {
    return { garden: emptyGarden().map((_, index) => plants[index] ?? null), book }
  }

  const growing = plants.filter((plant): plant is Plant => plant !== null)
  const garden = emptyGarden()
  growing.slice(0, GARDEN_CAPACITY).forEach((plant, i) => (garden[PLANTING_ORDER[i]] = plant))
  const overflowBook = growing
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
  const fresh: StoredState = {
    garden: emptyGarden(),
    book: {},
    weatherOverride: null,
    pendingBloom: null,
    place: null,
    forecastCache: null,
    lastSeen: now,
  }
  if (!raw) return fresh
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.garden)) return fresh
    const { garden, book } = toSlots(parsed.garden, cleanBook(parsed.book), localDateKey(new Date(now)))
    return {
      garden,
      book,
      weatherOverride: cleanOverride(parsed.weatherOverride),
      pendingBloom: cleanPendingBloom(parsed.pendingBloom),
      place: cleanPlace(parsed.place),
      forecastCache: cleanForecastCache(parsed.forecastCache),
      lastSeen: Number.isFinite(parsed.lastSeen) ? parsed.lastSeen : now,
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

// Asks the browser not to clear our saved garden when it tidies up storage. Some browsers
// grant this silently, some ask the player, some ignore it; it's a best-effort extra layer.
let persistenceRequested = false
export function requestPersistentStorage() {
  if (persistenceRequested) return
  persistenceRequested = true
  navigator.storage?.persist?.().catch(() => {})
}
