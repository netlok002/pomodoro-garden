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

// The three days shown in the arc: the real forecast when we have one, otherwise the
// simulation. A manual override set for today always wins for today.
export function forecast(now: Date, override: WeatherOverride | null, real: Forecast | null = null): Forecast {
  const dayOffset = (days: number) =>
    localDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
  const todayKey = dayOffset(0)
  const overrideToday = override && override.date === todayKey ? override.weather : null
  return {
    yesterday: real?.yesterday ?? simulatedWeather(dayOffset(-1)),
    today: overrideToday ?? real?.today ?? simulatedWeather(todayKey),
    tomorrow: real?.tomorrow ?? simulatedWeather(dayOffset(1)),
  }
}
