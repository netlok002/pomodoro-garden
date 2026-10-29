import { bloomStageFor, growthStage, stageName, type StageName } from './growth.ts'
import type { Species } from './species.ts'

const STAGE_GLYPHS: Record<Exclude<StageName, 'bloom'>, string> = {
  seed: '·',
  sprout: '🌱',
  stem: '🌿',
  bud: '🫧',
}

export function plantGlyph(species: Species, elapsedSeconds: number): string {
  const durationSeconds = species.durationMinutes * 60
  const name = stageName(growthStage(elapsedSeconds, durationSeconds), bloomStageFor(durationSeconds))
  return name === 'bloom' ? species.glyph : STAGE_GLYPHS[name]
}

export function renderGrowingPlant(container: HTMLElement, species: Species, elapsedSeconds: number) {
  const durationSeconds = species.durationMinutes * 60
  const name = stageName(growthStage(elapsedSeconds, durationSeconds), bloomStageFor(durationSeconds))
  container.innerHTML = `
    <div class="plant-glyph">${plantGlyph(species, elapsedSeconds)}</div>
    <p>${species.name} · ${name}</p>
  `
}

export function renderSeedChoice(container: HTMLElement, species: Species) {
  container.innerHTML = `
    <div class="plant-glyph">${STAGE_GLYPHS.seed}</div>
    <p>${species.name} seed</p>
  `
}
