import { describe, it, expect } from 'vitest'
import { SPECIES, getSpecies } from './species.ts'
import { WEATHERS } from '../weather/weather.ts'

describe('SPECIES', () => {
  it('has 8 species', () => {
    expect(SPECIES).toHaveLength(8)
  })

  it('has exactly 2 seeds for each length', () => {
    for (const minutes of [15, 30, 45, 60]) {
      const matching = SPECIES.filter((species) => species.durationMinutes === minutes)
      expect(matching).toHaveLength(2)
    }
  })

  it('has each weather preferred by exactly 2 species', () => {
    for (const weather of WEATHERS) {
      const matching = SPECIES.filter((species) => species.perfectWeather === weather)
      expect(matching).toHaveLength(2)
    }
  })

  it('gives every species a unique id', () => {
    const ids = new Set(SPECIES.map((species) => species.id))
    expect(ids.size).toBe(SPECIES.length)
  })
})

describe('getSpecies', () => {
  it('finds a species by id', () => {
    expect(getSpecies('glowcap').name).toBe('Glowcap')
  })
})
