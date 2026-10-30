import { describe, it, expect } from 'vitest'
import { bookArt, flowerboxArt, radioArt, sparkleArt, speciesArt, stageArt, weatherArt } from './art.ts'
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

describe('bookArt', () => {
  it('is a drawing', () => {
    expect(bookArt()).toContain('<svg')
  })
})

describe('ground lines', () => {
  const GROUND = 'M9 44 C17 43 31 45 39 44'

  it('draws plants on a patch of ground by default', () => {
    expect(stageArt('sprout')).toContain(GROUND)
    expect(speciesArt('glowcap')).toContain(GROUND)
  })

  it('leaves the ground out when the plant sits in the flowerbox', () => {
    expect(stageArt('sprout', { ground: false })).not.toContain(GROUND)
    expect(speciesArt('glowcap', { ground: false })).not.toContain(GROUND)
  })
})

describe('flowerboxArt', () => {
  it('is a drawing', () => {
    expect(flowerboxArt()).toContain('<svg')
  })
})

describe('radioArt', () => {
  it('is a drawing', () => {
    expect(radioArt()).toContain('<svg')
  })
})
