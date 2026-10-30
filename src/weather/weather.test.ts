import { describe, it, expect } from 'vitest'
import { WEATHERS, addWeatherTime, currentWeather, forecast, isPerfect, simulatedWeather } from './weather.ts'
import { localDateKey } from '../game/dates.ts'

describe('simulatedWeather', () => {
  it('always gives the same weather for the same date', () => {
    expect(simulatedWeather('2026-10-29')).toBe(simulatedWeather('2026-10-29'))
  })

  it('uses every weather type across a year', () => {
    const seen = new Set<string>()
    for (let day = 0; day < 365; day++) {
      seen.add(simulatedWeather(localDateKey(new Date(2026, 0, 1 + day))))
    }
    expect([...seen].sort()).toEqual([...WEATHERS].sort())
  })
})

describe('currentWeather', () => {
  it('uses the simulation when there is no override', () => {
    expect(currentWeather('2026-10-29', null)).toBe(simulatedWeather('2026-10-29'))
  })

  it('uses an override set for today', () => {
    expect(currentWeather('2026-10-29', { date: '2026-10-29', weather: 'rainy' })).toBe('rainy')
  })

  it('ignores an override left over from another day', () => {
    expect(currentWeather('2026-10-30', { date: '2026-10-29', weather: 'rainy' })).toBe(simulatedWeather('2026-10-30'))
  })
})

describe('addWeatherTime', () => {
  it('adds seconds to a weather in the tally without changing the original', () => {
    const tally = { clear: 60 }
    expect(addWeatherTime(tally, 'clear', 30)).toEqual({ clear: 90 })
    expect(addWeatherTime(tally, 'rainy', 10)).toEqual({ clear: 60, rainy: 10 })
    expect(tally).toEqual({ clear: 60 })
  })
})

describe('isPerfect', () => {
  it('is perfect when the favourite weather had the most time', () => {
    expect(isPerfect({ overcast: 600, clear: 1200 }, 'clear')).toBe(true)
  })

  it('is normal when another weather had more time', () => {
    expect(isPerfect({ overcast: 1200, clear: 600 }, 'clear')).toBe(false)
  })

  it('favours perfect in a tie', () => {
    expect(isPerfect({ overcast: 900, clear: 900 }, 'clear')).toBe(true)
  })

  it('is normal when the favourite weather never happened', () => {
    expect(isPerfect({}, 'clear')).toBe(false)
    expect(isPerfect({ rainy: 900 }, 'clear')).toBe(false)
  })
})

describe('forecast', () => {
  const today = new Date(2026, 9, 29, 15, 0)

  it('gives simulated weather for yesterday, today and tomorrow', () => {
    expect(forecast(today, null)).toEqual({
      yesterday: simulatedWeather('2026-10-28'),
      today: simulatedWeather('2026-10-29'),
      tomorrow: simulatedWeather('2026-10-30'),
    })
  })

  it('applies an override only to today', () => {
    const result = forecast(today, { date: '2026-10-29', weather: 'rainy' })
    expect(result.today).toBe('rainy')
    expect(result.tomorrow).toBe(simulatedWeather('2026-10-30'))
  })

  it('crosses month boundaries', () => {
    expect(forecast(new Date(2026, 10, 1), null).yesterday).toBe(simulatedWeather('2026-10-31'))
  })
})

describe('forecast with a real forecast', () => {
  const today = new Date(2026, 9, 29, 15, 0)
  const real = { yesterday: 'rainy', today: 'overcast', tomorrow: 'clear' } as const

  it('uses the real forecast instead of the simulation', () => {
    expect(forecast(today, null, real)).toEqual(real)
  })

  it('still lets a manual override win for today', () => {
    expect(forecast(today, { date: '2026-10-29', weather: 'partly-cloudy' }, real)).toEqual({
      ...real,
      today: 'partly-cloudy',
    })
  })
})
