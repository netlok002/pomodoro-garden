import type { WeatherTally } from './weather.ts'

export const GARDEN_CAPACITY = 10

export interface Flower {
  kind: 'flower'
  speciesId: string
  perfect: boolean
}

export interface Sprout {
  kind: 'sprout'
  speciesId: string
  elapsedSeconds: number
  weatherSeconds: WeatherTally
}

export type Plant = Flower | Sprout

export type Garden = Plant[]

export function isFull(garden: Garden): boolean {
  return garden.length >= GARDEN_CAPACITY
}

export function placePlant(garden: Garden, plant: Plant, slotIndex?: number): Garden {
  if (slotIndex !== undefined) {
    return garden.map((existing, index) => (index === slotIndex ? plant : existing))
  }
  if (isFull(garden)) throw new Error('Garden is full')
  return [...garden, plant]
}

export function removePlant(garden: Garden, slotIndex: number): Garden {
  return garden.filter((_, index) => index !== slotIndex)
}
