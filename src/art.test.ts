import { describe, it, expect } from 'vitest'
import { sparkleArt, speciesArt, stageArt, weatherArt } from './art.ts'
import { WEATHERS } from './weather.ts'
import { SPECIES } from './species.ts'

describe('speciesArt', () => {
  it('has a drawing for every species', () => {
    for (const species of SPECIES) {
      expect(speciesArt(species.id)).toContain('<svg')
    }
  })
})

describe('stageArt', () => {
  it('has a drawing for every growing stage', () => {
    for (const stage of ['seed', 'sprout', 'stem', 'bud'] as const) {
      expect(stageArt(stage)).toContain('<svg')
    }
  })
})

describe('weatherArt', () => {
  it('has a drawing for every weather', () => {
    for (const weather of WEATHERS) {
      expect(weatherArt(weather)).toContain('<svg')
    }
  })
})

describe('sparkleArt', () => {
  it('is a drawing', () => {
    expect(sparkleArt()).toContain('<svg')
  })
})
