import { describe, it, expect } from 'vitest'
import { speciesArt, stageArt } from './art.ts'
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
