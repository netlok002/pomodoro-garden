import type { Weather } from './weather.ts'

export interface Species {
  id: string
  name: string
  durationMinutes: number
  perfectWeather: Weather
}

export const SPECIES: Species[] = [
  { id: 'glowcap', name: 'Glowcap', durationMinutes: 15, perfectWeather: 'rainy' },
  { id: 'zipbloom', name: 'Zipbloom', durationMinutes: 15, perfectWeather: 'partly-cloudy' },
  { id: 'murkmoss', name: 'Murkmoss', durationMinutes: 30, perfectWeather: 'overcast' },
  { id: 'prismpetal', name: 'Prismpetal', durationMinutes: 30, perfectWeather: 'clear' },
  { id: 'driptongue', name: 'Driptongue', durationMinutes: 45, perfectWeather: 'rainy' },
  { id: 'veilvine', name: 'Veilvine', durationMinutes: 45, perfectWeather: 'partly-cloudy' },
  { id: 'gloomorchid', name: 'Gloomorchid', durationMinutes: 60, perfectWeather: 'overcast' },
  { id: 'solar-thistle', name: 'Solar Thistle', durationMinutes: 60, perfectWeather: 'clear' },
]

export function getSpecies(id: string): Species {
  const species = SPECIES.find((candidate) => candidate.id === id)
  if (!species) throw new Error(`Unknown species: ${id}`)
  return species
}
