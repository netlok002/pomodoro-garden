import { describe, it, expect } from 'vitest'
import {
  GARDEN_CAPACITY,
  emptyGarden,
  firstEmptySlot,
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

describe('firstEmptySlot', () => {
  it('finds the leftmost empty slot, even between plants', () => {
    const garden = gardenOf(4)
    garden[1] = null
    expect(firstEmptySlot(garden)).toBe(1)
  })

  it('gives -1 when the garden is full', () => {
    expect(firstEmptySlot(gardenOf(5))).toBe(-1)
  })
})

describe('placePlant', () => {
  it('puts a new plant in the first empty slot', () => {
    const garden = gardenOf(3)
    garden[1] = null
    const result = placePlant(garden, sprout)
    expect(result[1]).toEqual(sprout)
    expect(result[0]).toEqual(flower)
    expect(result[2]).toEqual(flower)
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
