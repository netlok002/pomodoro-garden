import { describe, it, expect } from 'vitest'
import { createWeatherController } from './weatherController.ts'
import { createGameState } from './gameState.ts'
import { emptyGarden } from './garden.ts'
import { simulatedWeather } from './weather.ts'
import type { StoredState } from './storage.ts'

const NOW = new Date(2026, 9, 30, 15, 0)

const PORTLAND_REPLY = {
  'post code': '97201',
  places: [{ 'place name': 'Portland', 'state abbreviation': 'OR', latitude: '45.5', longitude: '-122.7' }],
}

// A fake network: the zip service and the forecast service can each succeed or fail.
const fakeNetwork = ({ zipStatus = 200, forecastStatus = 200 } = {}) => {
  const calls: string[] = []
  const fetchFn = async (url: string) => {
    calls.push(url)
    const isZip = url.includes('zippopotam')
    const status = isZip ? zipStatus : forecastStatus
    const body = isZip ? PORTLAND_REPLY : { daily: { weather_code: [61, 0, 3] } }
    return { ok: status === 200, status, json: async () => body } as Response
  }
  return { fetchFn, calls }
}

const setup = (network = fakeNetwork()) => {
  const fresh: StoredState = {
    garden: emptyGarden(),
    book: {},
    weatherOverride: null,
    pendingBloom: null,
    place: null,
    forecastCache: null,
    lastSeen: 1,
  }
  const game = createGameState(() => fresh, () => {})
  let changes = 0
  const weather = createWeatherController(game, {
    fetchFn: network.fetchFn,
    now: () => NOW,
    onChange: () => changes++,
  })
  return { game, weather, network, changeCount: () => changes }
}

describe('weatherController', () => {
  it('uses the simulation when no zip is set', () => {
    const { weather } = setup()
    expect(weather.forecast().today).toBe(simulatedWeather('2026-10-30'))
    expect(weather.status()).toBe('No zip code set, so the weather is simulated.')
  })

  it('sets and clears a manual override for today', () => {
    const { weather, game, changeCount } = setup()
    weather.setOverride('rainy')
    expect(weather.overrideToday()).toBe('rainy')
    expect(weather.now()).toBe('rainy')
    expect(game.current.weatherOverride).toEqual({ date: '2026-10-30', weather: 'rainy' })
    weather.setOverride(null)
    expect(weather.overrideToday()).toBeNull()
    expect(changeCount()).toBe(2)
  })

  it('rejects a badly typed zip without calling the network', async () => {
    const { weather, network } = setup()
    expect(await weather.saveZip('972')).toBe('Please enter a 5-digit US zip code.')
    expect(network.calls).toHaveLength(0)
  })

  it('saves a zip and grows under its real forecast', async () => {
    const { weather, game } = setup()
    expect(await weather.saveZip('97201')).toBe('Growing under the real forecast for Portland, OR.')
    expect(game.current.place?.name).toBe('Portland')
    expect(weather.forecast()).toEqual({ yesterday: 'rainy', today: 'clear', tomorrow: 'overcast' })
  })

  it('explains an unknown zip', async () => {
    const { weather, game } = setup(fakeNetwork({ zipStatus: 404 }))
    expect(await weather.saveZip('00000')).toBe("Couldn't find zip code 00000.")
    expect(game.current.place).toBeNull()
  })

  it('falls back to the simulation when the weather service is down', async () => {
    const { weather } = setup(fakeNetwork({ forecastStatus: 503 }))
    expect(await weather.saveZip('97201')).toBe(
      "Couldn't reach the weather service for Portland, OR, so the weather is simulated for now.",
    )
    expect(weather.forecast().today).toBe(simulatedWeather('2026-10-30'))
  })

  it('only asks for the forecast once a day', async () => {
    const { weather, network } = setup()
    await weather.saveZip('97201')
    await weather.refresh()
    await weather.refresh()
    expect(network.calls.filter((url) => url.includes('open-meteo'))).toHaveLength(1)
  })

  it('clears the zip and goes back to the simulation', async () => {
    const { weather, game } = setup()
    await weather.saveZip('97201')
    expect(weather.clearZip()).toBe('No zip code set, so the weather is simulated.')
    expect(game.current.place).toBeNull()
    expect(game.current.forecastCache).toBeNull()
  })
})
