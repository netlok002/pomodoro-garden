import type { WeatherTally } from './weather.ts'

export const GARDEN_CAPACITY = 5

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

// A fixed row of slots; null is an empty patch of ground. Plants never move once placed.
export type Slot = Plant | null

export type Garden = Slot[]

export function emptyGarden(): Garden {
  return Array<Slot>(GARDEN_CAPACITY).fill(null)
}

export function firstEmptySlot(garden: Garden): number {
  return garden.indexOf(null)
}

export function isFull(garden: Garden): boolean {
  return firstEmptySlot(garden) === -1
}

export function placePlant(garden: Garden, plant: Plant, slotIndex?: number): Garden {
  const target = slotIndex ?? firstEmptySlot(garden)
  if (target === -1) throw new Error('Garden is full')
  return garden.map((existing, index) => (index === target ? plant : existing))
}

export function removePlant(garden: Garden, slotIndex: number): Garden {
  return garden.map((existing, index) => (index === slotIndex ? null : existing))
}
