import { bloomStageFor, growthStage, stageName } from './growth.ts'
import { sparkleArt, speciesArt, stageArt } from './art.ts'
import type { Species } from './species.ts'

export function plantArt(species: Species, elapsedSeconds: number): string {
  const durationSeconds = species.durationMinutes * 60
  const name = stageName(growthStage(elapsedSeconds, durationSeconds), bloomStageFor(durationSeconds))
  return name === 'bloom' ? speciesArt(species.id) : stageArt(name)
}

export function renderGrowingPlant(container: HTMLElement, species: Species, elapsedSeconds: number) {
  const durationSeconds = species.durationMinutes * 60
  const name = stageName(growthStage(elapsedSeconds, durationSeconds), bloomStageFor(durationSeconds))
  container.innerHTML = `
    <div class="plant-art">${plantArt(species, elapsedSeconds)}</div>
    <p>${species.name} · ${name}</p>
  `
}

export function renderSeedChoice(container: HTMLElement, species: Species) {
  container.innerHTML = `
    <div class="plant-art">${stageArt('seed')}</div>
    <p>${species.name} seed</p>
  `
}

// Where the twinkles sit around the bloom, as % of the stage, with staggered timing.
const SPARKLES = [
  { left: 12, top: 18, delay: 0 },
  { left: 84, top: 12, delay: 0.7 },
  { left: 90, top: 58, delay: 1.4 },
  { left: 6, top: 62, delay: 2.1 },
  { left: 50, top: 2, delay: 1.1 },
]

export function renderCelebration(container: HTMLElement, species: Species, perfect: boolean) {
  const sparkles = SPARKLES.map(
    ({ left, top, delay }) =>
      `<span class="sparkle" style="left: ${left}%; top: ${top}%; animation-delay: ${delay}s">${sparkleArt()}</span>`,
  ).join('')

  container.innerHTML = `
    <div class="celebration">
      ${sparkles}
      <div class="plant-art celebration-art${perfect ? ' perfect' : ''}">${speciesArt(species.id)}</div>
    </div>
    <p>${perfect ? 'A perfect ' : 'A '}${species.name} bloomed!</p>
  `
}
