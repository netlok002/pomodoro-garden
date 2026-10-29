import { bloomStageFor, growthStage, stageName } from './growth.ts'
import { speciesArt, stageArt } from './art.ts'
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
