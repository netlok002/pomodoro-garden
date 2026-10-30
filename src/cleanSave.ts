// Saves can come from a pasted save code, so every field is treated as untrusted:
// anything unexpected is dropped rather than trusted. Missing fields from older saves
// get sensible defaults.
import { isObject } from './typeGuards.ts'
import { GARDEN_CAPACITY, type PendingBloom, type Plant } from './garden.ts'
import type { Book, BookEntry, Variant } from './book.ts'
import type { CachedForecast, Place } from './realWeather.ts'
import { SPECIES } from './species.ts'
import { WEATHERS, type Forecast, type Weather, type WeatherOverride, type WeatherTally } from './weather.ts'

const isKnownSpecies = (id: unknown): id is string => SPECIES.some((species) => species.id === id)
const isWeather = (value: unknown): value is Weather => WEATHERS.includes(value as Weather)
const isDateKey = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
const isCount = (value: unknown): value is number => Number.isFinite(value) && (value as number) >= 0

function cleanTally(value: unknown): WeatherTally {
  if (!isObject(value)) return {}
  const tally: WeatherTally = {}
  for (const weather of WEATHERS) {
    if (isCount(value[weather]) && value[weather] > 0) tally[weather] = value[weather]
  }
  return tally
}

export function cleanPlant(value: unknown): Plant | null {
  if (!isObject(value) || !isKnownSpecies(value.speciesId)) return null
  if (value.kind === 'flower') return { kind: 'flower', speciesId: value.speciesId, perfect: value.perfect === true }
  if (value.kind === 'sprout' && isCount(value.elapsedSeconds)) {
    return {
      kind: 'sprout',
      speciesId: value.speciesId,
      elapsedSeconds: value.elapsedSeconds,
      weatherSeconds: cleanTally(value.weatherSeconds),
    }
  }
  return null
}

function cleanEntry(value: unknown): BookEntry | null {
  if (!isObject(value) || !isCount(value.count) || !isDateKey(value.firstFound)) return null
  return { count: value.count, firstFound: value.firstFound }
}

export function cleanBook(value: unknown): Book {
  if (!isObject(value)) return {}
  const book: Book = {}
  for (const [speciesId, page] of Object.entries(value)) {
    if (!isKnownSpecies(speciesId) || !isObject(page)) continue
    const cleaned: Partial<Record<Variant, BookEntry>> = {}
    for (const variant of ['normal', 'perfect'] as const) {
      const entry = cleanEntry(page[variant])
      if (entry) cleaned[variant] = entry
    }
    if (cleaned.normal || cleaned.perfect) book[speciesId] = cleaned
  }
  return book
}

export function cleanOverride(value: unknown): WeatherOverride | null {
  if (!isObject(value) || !isDateKey(value.date) || !isWeather(value.weather)) return null
  return { date: value.date, weather: value.weather }
}

export function cleanPendingBloom(value: unknown): PendingBloom | null {
  if (!isObject(value) || !isKnownSpecies(value.speciesId)) return null
  const slot = value.slotIndex
  if (!Number.isInteger(slot) || slot < 0 || slot >= GARDEN_CAPACITY) return null
  return { speciesId: value.speciesId, perfect: value.perfect === true, slotIndex: slot }
}

export function cleanPlace(value: unknown): Place | null {
  if (!isObject(value) || typeof value.zip !== 'string' || !/^\d{5}$/.test(value.zip)) return null
  if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) return null
  return {
    zip: value.zip,
    name: String(value.name ?? '').slice(0, 80),
    state: String(value.state ?? '').slice(0, 20),
    latitude: value.latitude,
    longitude: value.longitude,
  }
}

function cleanForecast(value: unknown): Forecast | null {
  if (!isObject(value)) return null
  const { yesterday, today, tomorrow } = value
  if (!isWeather(yesterday) || !isWeather(today) || !isWeather(tomorrow)) return null
  return { yesterday, today, tomorrow }
}

export function cleanForecastCache(value: unknown): CachedForecast | null {
  if (!isObject(value) || !isDateKey(value.date) || typeof value.zip !== 'string') return null
  const forecast = cleanForecast(value.forecast)
  return forecast ? { date: value.date, zip: value.zip, forecast } : null
}
