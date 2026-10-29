import { describe, it, expect } from 'vitest'
import { GARDEN_CAPACITY, isFull, placePlant, removePlant, type Garden, type Plant } from './garden.ts'

const flower: Plant = { kind: 'flower', speciesId: 'glowcap' }
const sprout: Plant = { kind: 'sprout', speciesId: 'veilvine', elapsedSeconds: 600 }

const gardenOf = (count: number): Garden => Array.from({ length: count }, () => flower)

describe('isFull', () => {
  it('is not full when empty', () => {
    expect(isFull([])).toBe(false)
  })

  it('is full at 10 plants, counting sprouts', () => {
    expect(GARDEN_CAPACITY).toBe(10)
    expect(isFull([...gardenOf(9), sprout])).toBe(true)
  })
})

describe('placePlant', () => {
  it('puts a new plant in the next empty slot', () => {
    expect(placePlant([flower], sprout)).toEqual([flower, sprout])
  })

  it('replaces the plant in a given slot, keeping the others in place', () => {
    const grown: Plant = { kind: 'flower', speciesId: 'veilvine' }
    expect(placePlant([flower, sprout, flower], grown, 1)).toEqual([flower, grown, flower])
  })

  it('does not change the original garden', () => {
    const garden: Garden = [flower]
    placePlant(garden, sprout)
    expect(garden).toEqual([flower])
  })

  it('refuses a new plant when the garden is full', () => {
    expect(() => placePlant(gardenOf(10), sprout)).toThrow()
  })

  it('still lets a sprout in a full garden finish growing in its slot', () => {
    const fullWithSprout = [...gardenOf(9), sprout]
    const grown: Plant = { kind: 'flower', speciesId: 'veilvine' }
    expect(placePlant(fullWithSprout, grown, 9)[9]).toEqual(grown)
  })
})

describe('removePlant', () => {
  it('takes the plant out of its slot, shifting later plants down', () => {
    const other: Plant = { kind: 'flower', speciesId: 'murkmoss' }
    expect(removePlant([flower, sprout, other], 1)).toEqual([flower, other])
  })

  it('frees space in a full garden', () => {
    expect(isFull(removePlant(gardenOf(10), 0))).toBe(false)
  })
})
