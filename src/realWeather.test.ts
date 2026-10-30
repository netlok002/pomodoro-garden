import { describe, it, expect } from 'vitest'
import { fakeFetch } from './testing/fakeFetch.ts'
import {
  ZipNotFoundError,
  fetchRealForecast,
  isFresh,
  isValidZip,
  lookupZip,
  parseForecast,
  parseZipLookup,
  weatherFromCode,
  type Place,
} from './realWeather.ts'

const PORTLAND: Place = { zip: '97201', name: 'Portland', state: 'OR', latitude: 45.5078, longitude: -122.6897 }


describe('weatherFromCode', () => {
  it('sorts weather codes into our four weathers', () => {
    expect(weatherFromCode(0)).toBe('clear')
    expect(weatherFromCode(1)).toBe('partly-cloudy')
    expect(weatherFromCode(2)).toBe('partly-cloudy')
    expect(weatherFromCode(3)).toBe('overcast')
    expect(weatherFromCode(61)).toBe('rainy')
    expect(weatherFromCode(81)).toBe('rainy')
    expect(weatherFromCode(95)).toBe('rainy')
  })

  it('counts fog as overcast', () => {
    expect(weatherFromCode(45)).toBe('overcast')
    expect(weatherFromCode(48)).toBe('overcast')
  })

  it('counts snow and sleet as rainy', () => {
    expect(weatherFromCode(56)).toBe('rainy')
    expect(weatherFromCode(71)).toBe('rainy')
    expect(weatherFromCode(86)).toBe('rainy')
  })
})

describe('isValidZip', () => {
  it('accepts five digits only', () => {
    expect(isValidZip('97201')).toBe(true)
    expect(isValidZip(' 97201 ')).toBe(true)
    expect(isValidZip('9720')).toBe(false)
    expect(isValidZip('97201-1234')).toBe(false)
    expect(isValidZip('abcde')).toBe(false)
  })
})

describe('parseZipLookup', () => {
  it('reads the place name and coordinates', () => {
    const reply = {
      'post code': '97201',
      places: [{ 'place name': 'Portland', 'state abbreviation': 'OR', latitude: '45.5078', longitude: '-122.6897' }],
    }
    expect(parseZipLookup(reply)).toEqual(PORTLAND)
  })
})

describe('parseForecast', () => {
  it('reads yesterday, today and tomorrow from three days of codes', () => {
    const reply = { daily: { time: ['2026-10-28', '2026-10-29', '2026-10-30'], weather_code: [65, 0, 3] } }
    expect(parseForecast(reply)).toEqual({ yesterday: 'rainy', today: 'clear', tomorrow: 'overcast' })
  })

  it('gives null for a reply without three days', () => {
    expect(parseForecast({ daily: { weather_code: [1, 2] } })).toBeNull()
    expect(parseForecast({})).toBeNull()
  })
})

describe('isFresh', () => {
  const cache = { date: '2026-10-29', zip: '97201', forecast: { yesterday: 'rainy', today: 'clear', tomorrow: 'clear' } } as const

  it('is fresh on the same day for the same zip', () => {
    expect(isFresh(cache, '2026-10-29', '97201')).toBe(true)
  })

  it('goes stale the next day or when the zip changes', () => {
    expect(isFresh(cache, '2026-10-30', '97201')).toBe(false)
    expect(isFresh(cache, '2026-10-29', '10001')).toBe(false)
    expect(isFresh(null, '2026-10-29', '97201')).toBe(false)
  })
})

describe('lookupZip', () => {
  it('asks Zippopotam about a US zip', async () => {
    const { fetchFn, calls } = fakeFetch(200, {
      'post code': '97201',
      places: [{ 'place name': 'Portland', 'state abbreviation': 'OR', latitude: '45.5078', longitude: '-122.6897' }],
    })
    expect(await lookupZip('97201', fetchFn)).toEqual(PORTLAND)
    expect(calls.map((call) => call.url)).toEqual(['https://api.zippopotam.us/us/97201'])
  })

  it('reports an unknown zip clearly', async () => {
    const { fetchFn } = fakeFetch(404, {})
    await expect(lookupZip('00000', fetchFn)).rejects.toBeInstanceOf(ZipNotFoundError)
  })
})

describe('fetchRealForecast', () => {
  it('asks Open-Meteo for yesterday through tomorrow at the place', async () => {
    const { fetchFn, calls } = fakeFetch(200, { daily: { weather_code: [61, 2, 0] } })
    expect(await fetchRealForecast(PORTLAND, fetchFn)).toEqual({ yesterday: 'rainy', today: 'partly-cloudy', tomorrow: 'clear' })
    expect(calls[0].url).toContain('latitude=45.5078')
    expect(calls[0].url).toContain('longitude=-122.6897')
    expect(calls[0].url).toContain('past_days=1')
    expect(calls[0].url).toContain('forecast_days=2')
    expect(calls[0].url).toContain('timezone=auto')
  })

  it('fails when the service is down', async () => {
    const { fetchFn } = fakeFetch(503, {})
    await expect(fetchRealForecast(PORTLAND, fetchFn)).rejects.toThrow()
  })
})
