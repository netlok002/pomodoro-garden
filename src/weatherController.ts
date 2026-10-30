// Everything about today's weather: the real forecast for the saved zip (fetched at most
// once a day), the simulation when there isn't one, the manual override, and a status
// line explaining which is in use. onChange fires whenever the forecast shown changes.
import { localDateKey } from './dates.ts'
import type { GameState } from './gameState.ts'
import { forecast, type Forecast, type Weather } from './weather.ts'
import { ZipNotFoundError, fetchRealForecast, isFresh, isValidZip, lookupZip, type FetchFn } from './realWeather.ts'

export interface WeatherController {
  forecast: () => Forecast
  now: () => Weather
  overrideToday: () => Weather | null
  setOverride: (weather: Weather | null) => void
  refresh: () => Promise<void>
  status: () => string
  saveZip: (zip: string) => Promise<string>
  clearZip: () => string
  // After loading a save code, forget the last network failure.
  resetProblems: () => void
}

interface Options {
  fetchFn?: FetchFn
  now?: () => Date
  onChange?: () => void
}

export function createWeatherController(
  game: GameState,
  { fetchFn = fetch, now = () => new Date(), onChange = () => {} }: Options = {},
): WeatherController {
  let refreshing = false
  let refreshFailed = false

  const todayKey = () => localDateKey(now())

  // The real forecast counts only while today's cached copy matches the saved zip.
  const realForecast = () => {
    const { place, forecastCache } = game.current
    return place && isFresh(forecastCache, todayKey(), place.zip) ? forecastCache!.forecast : null
  }

  const currentForecast = () => forecast(now(), game.current.weatherOverride, realForecast())

  const status = () => {
    const { place } = game.current
    if (!place) return 'No zip code set, so the weather is simulated.'
    const where = `${place.name}, ${place.state}`
    if (realForecast()) return `Growing under the real forecast for ${where}.`
    if (refreshFailed) return `Couldn't reach the weather service for ${where}, so the weather is simulated for now.`
    return `Fetching the forecast for ${where}…`
  }

  const refresh = async () => {
    const { place } = game.current
    if (!place || refreshing || realForecast()) return
    refreshing = true
    try {
      const fetched = await fetchRealForecast(place, fetchFn)
      game.update({ forecastCache: { date: todayKey(), zip: place.zip, forecast: fetched } })
      refreshFailed = false
      onChange()
    } catch {
      refreshFailed = true
    } finally {
      refreshing = false
    }
  }

  return {
    forecast: currentForecast,
    now: () => currentForecast().today,
    status,
    refresh,

    overrideToday: () => {
      const override = game.current.weatherOverride
      return override?.date === todayKey() ? override.weather : null
    },

    setOverride: (weather) => {
      game.update({ weatherOverride: weather ? { date: todayKey(), weather } : null })
      onChange()
    },

    saveZip: async (zip) => {
      if (!isValidZip(zip)) return 'Please enter a 5-digit US zip code.'
      try {
        game.update({ place: await lookupZip(zip, fetchFn), forecastCache: null })
      } catch (error) {
        return error instanceof ZipNotFoundError
          ? `Couldn't find zip code ${zip.trim()}.`
          : "Couldn't reach the zip code lookup. Check your connection and try again."
      }
      await refresh()
      onChange()
      return status()
    },

    clearZip: () => {
      game.update({ place: null, forecastCache: null })
      refreshFailed = false
      onChange()
      return status()
    },

    resetProblems: () => {
      refreshFailed = false
    },
  }
}
