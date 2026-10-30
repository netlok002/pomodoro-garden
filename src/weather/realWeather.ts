import type { Forecast, Weather } from './weather.ts'

// A US zip code resolved to a named place with coordinates.
export interface Place {
  zip: string
  name: string
  state: string
  latitude: number
  longitude: number
}

// A real forecast saved for one zip on one day, so we only ask once a day.
export interface CachedForecast {
  date: string
  zip: string
  forecast: Forecast
}

export type FetchFn = (url: string) => Promise<Response>

export class ZipNotFoundError extends Error {
  constructor(zip: string) {
    super(`No place found for zip ${zip}`)
  }
}

// Open-Meteo describes each day with a WMO weather code; fold them into our four weathers.
// Fog counts as overcast; drizzle, rain, snow, sleet and storms all count as rainy.
export function weatherFromCode(code: number): Weather {
  if (code === 0) return 'clear'
  if (code === 1 || code === 2) return 'partly-cloudy'
  if (code === 3 || code === 45 || code === 48) return 'overcast'
  if (code >= 51) return 'rainy'
  return 'overcast'
}

export function isValidZip(text: string): boolean {
  return /^\d{5}$/.test(text.trim())
}

// Zippopotam replies with { 'post code', places: [{ 'place name', 'state abbreviation', latitude, longitude }] }.
export function parseZipLookup(reply: any): Place {
  const place = reply.places[0]
  return {
    zip: reply['post code'],
    name: place['place name'],
    state: place['state abbreviation'],
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  }
}

// Open-Meteo replies with daily.weather_code for [yesterday, today, tomorrow].
export function parseForecast(reply: any): Forecast | null {
  const codes = reply?.daily?.weather_code
  if (!Array.isArray(codes) || codes.length !== 3) return null
  const [yesterday, today, tomorrow] = codes.map(weatherFromCode)
  return { yesterday, today, tomorrow }
}

export function isFresh(cache: CachedForecast | null, todayKey: string, zip: string): boolean {
  return cache !== null && cache.date === todayKey && cache.zip === zip
}

export async function lookupZip(zip: string, fetchFn: FetchFn = fetch): Promise<Place> {
  const response = await fetchFn(`https://api.zippopotam.us/us/${zip.trim()}`)
  if (response.status === 404) throw new ZipNotFoundError(zip)
  if (!response.ok) throw new Error(`Zip lookup failed (${response.status})`)
  return parseZipLookup(await response.json())
}

export async function fetchRealForecast(place: Place, fetchFn: FetchFn = fetch): Promise<Forecast> {
  const params = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    daily: 'weather_code',
    past_days: '1',
    forecast_days: '2',
    timezone: 'auto',
  })
  const response = await fetchFn(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!response.ok) throw new Error(`Forecast request failed (${response.status})`)
  const forecast = parseForecast(await response.json())
  if (!forecast) throw new Error('Forecast reply was missing days')
  return forecast
}
