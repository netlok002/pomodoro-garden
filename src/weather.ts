import { localDateKey } from './dates.ts'

export const WEATHERS = ['clear', 'partly-cloudy', 'overcast', 'rainy'] as const

export type Weather = (typeof WEATHERS)[number]

export const WEATHER_LABELS: Record<Weather, string> = {
  clear: 'Clear',
  'partly-cloudy': 'Partly Cloudy',
  overcast: 'Overcast',
  rainy: 'Rainy',
}

// A weather picked by hand. It only counts on the day it was set.
export interface WeatherOverride {
  date: string
  weather: Weather
}

// Seconds a plant has grown under each weather.
export type WeatherTally = Partial<Record<Weather, number>>

// FNV-1a: scrambles text into a number, the same number every time for the same text.
function hash(text: string): number {
  let value = 2166136261
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i)
    value = Math.imul(value, 16777619)
  }
  return value >>> 0
}

export function simulatedWeather(dateKey: string): Weather {
  return WEATHERS[hash(dateKey) % WEATHERS.length]
}

export function currentWeather(dateKey: string, override: WeatherOverride | null): Weather {
  if (override && override.date === dateKey) return override.weather
  return simulatedWeather(dateKey)
}

export function addWeatherTime(tally: WeatherTally, weather: Weather, seconds: number): WeatherTally {
  return { ...tally, [weather]: (tally[weather] ?? 0) + seconds }
}

export function isPerfect(tally: WeatherTally, favourite: Weather): boolean {
  const favouriteSeconds = tally[favourite] ?? 0
  if (favouriteSeconds === 0) return false
  return WEATHERS.every((weather) => (tally[weather] ?? 0) <= favouriteSeconds)
}

export interface Forecast {
  yesterday: Weather
  today: Weather
  tomorrow: Weather
}

export function forecast(now: Date, override: WeatherOverride | null): Forecast {
  const dayOffset = (days: number) =>
    localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
  return {
    yesterday: simulatedWeather(dayOffset(-1)),
    today: currentWeather(dayOffset(0), override),
    tomorrow: simulatedWeather(dayOffset(1)),
  }
}
