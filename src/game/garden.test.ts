import { describe, it, expect } from 'vitest'
import {
  GARDEN_CAPACITY,
  emptyGarden,
  PLANTING_ORDER,
  nextEmptySlot,
  isFull,
  placePlant,
  removePlant,
  type Garden,
  type Plant,
} from './garden.ts'

const flower: Plant = { kind: 'flower', speciesId: 'glowcap', perfect: false }
const sprout: Plant = { kind: 'sprout', speciesId: 'veilvine', elapsedSeconds: 600, weatherSeconds: {} }

const gardenOf = (count: number): Garden =>
  emptyGarden().map((slot, index) => (index < count ? flower : slot))

describe('emptyGarden', () => {
  it('has 5 empty slots', () => {
    expect(GARDEN_CAPACITY).toBe(5)
    expect(emptyGarden()).toEqual(Array(5).fill(null))
  })
})

describe('isFull', () => {
  it('is not full when empty', () => {
    expect(isFull(emptyGarden())).toBe(false)
  })

  it('is full when every slot holds a plant, counting sprouts', () => {
    const garden = gardenOf(4)
    garden[4] = sprout
    expect(isFull(garden)).toBe(true)
  })
})

describe('PLANTING_ORDER', () => {
  it('starts in the middle and works outward, left before right', () => {
    expect(PLANTING_ORDER).toEqual([2, 1, 3, 0, 4])
  })
})

describe('nextEmptySlot', () => {
  it('fills the middle of an empty garden first', () => {
    expect(nextEmptySlot(emptyGarden())).toBe(2)
  })

  it('fills outward from the middle as the garden grows', () => {
    let garden = emptyGarden()
    const filled: number[] = []
    for (let i = 0; i < GARDEN_CAPACITY; i++) {
      const slot = nextEmptySlot(garden)
      filled.push(slot)
      garden = placePlant(garden, flower, slot)
    }
    expect(filled).toEqual([2, 1, 3, 0, 4])
  })

  it('refills a picked gap in planting order', () => {
    const garden = gardenOf(5)
    garden[0] = null
    garden[3] = null
    expect(nextEmptySlot(garden)).toBe(3)
  })

  it('gives -1 when the garden is full', () => {
    expect(nextEmptySlot(gardenOf(5))).toBe(-1)
  })
})

describe('placePlant', () => {
  it('puts a new plant in the next empty slot', () => {
    const garden = gardenOf(5)
    garden[1] = null
    garden[4] = null
    const result = placePlant(garden, sprout)
    expect(result[1]).toEqual(sprout)
    expect(result[4]).toBeNull()
    expect(result[0]).toEqual(flower)
  })

  it('replaces the plant in a given slot, leaving the others in place', () => {
    const grown: Plant = { kind: 'flower', speciesId: 'veilvine', perfect: true }
    const garden = gardenOf(3)
    garden[1] = sprout
    expect(placePlant(garden, grown, 1).slice(0, 3)).toEqual([flower, grown, flower])
  })

  it('does not change the original garden', () => {
    const garden = emptyGarden()
    placePlant(garden, sprout)
    expect(garden).toEqual(emptyGarden())
  })

  it('refuses a new plant when the garden is full', () => {
    expect(() => placePlant(gardenOf(5), sprout)).toThrow()
  })

  it('still lets a sprout in a full garden finish growing in its slot', () => {
    const garden = gardenOf(5)
    garden[4] = sprout
    expect(placePlant(garden, flower, 4)[4]).toEqual(flower)
  })
})

describe('removePlant', () => {
  it('empties the slot without moving any other plant', () => {
    const other: Plant = { kind: 'flower', speciesId: 'murkmoss', perfect: false }
    const garden = gardenOf(3)
    garden[2] = other
    const result = removePlant(garden, 1)
    expect(result.slice(0, 3)).toEqual([flower, null, other])
    expect(result).toHaveLength(GARDEN_CAPACITY)
  })

  it('frees space in a full garden', () => {
    expect(isFull(removePlant(gardenOf(5), 0))).toBe(false)
  })
})
