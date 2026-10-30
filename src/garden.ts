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

// New plants start in the middle of the box and work outward, left before right.
export const PLANTING_ORDER: number[] = (() => {
  const middle = Math.floor((GARDEN_CAPACITY - 1) / 2)
  const order = [middle]
  for (let step = 1; order.length < GARDEN_CAPACITY; step++) {
    if (middle - step >= 0) order.push(middle - step)
    if (middle + step < GARDEN_CAPACITY) order.push(middle + step)
  }
  return order
})()

export function nextEmptySlot(garden: Garden): number {
  return PLANTING_ORDER.find((slot) => garden[slot] === null) ?? -1
}

export function isFull(garden: Garden): boolean {
  return nextEmptySlot(garden) === -1
}

export function placePlant(garden: Garden, plant: Plant, slotIndex?: number): Garden {
  const target = slotIndex ?? nextEmptySlot(garden)
  if (target === -1) throw new Error('Garden is full')
  return garden.map((existing, index) => (index === target ? plant : existing))
}

export function removePlant(garden: Garden, slotIndex: number): Garden {
  return garden.map((existing, index) => (index === slotIndex ? null : existing))
}
