import type { Weather } from './weather.ts'

export interface Species {
  id: string
  name: string
  glyph: string
  durationMinutes: number
  perfectWeather: Weather
}

export const SPECIES: Species[] = [
  { id: 'glowcap', name: 'Glowcap', glyph: '🍄', durationMinutes: 15, perfectWeather: 'rainy' },
  { id: 'zipbloom', name: 'Zipbloom', glyph: '✴️', durationMinutes: 15, perfectWeather: 'partly-cloudy' },
  { id: 'murkmoss', name: 'Murkmoss', glyph: '🦠', durationMinutes: 30, perfectWeather: 'overcast' },
  { id: 'prismpetal', name: 'Prismpetal', glyph: '💎', durationMinutes: 30, perfectWeather: 'clear' },
  { id: 'driptongue', name: 'Driptongue', glyph: '🪷', durationMinutes: 45, perfectWeather: 'rainy' },
  { id: 'veilvine', name: 'Veilvine', glyph: '🪼', durationMinutes: 45, perfectWeather: 'partly-cloudy' },
  { id: 'gloomorchid', name: 'Gloomorchid', glyph: '👁️', durationMinutes: 60, perfectWeather: 'overcast' },
  { id: 'solar-thistle', name: 'Solar Thistle', glyph: '🌻', durationMinutes: 60, perfectWeather: 'clear' },
]

export function getSpecies(id: string): Species {
  const species = SPECIES.find((candidate) => candidate.id === id)
  if (!species) throw new Error(`Unknown species: ${id}`)
  return species
}
