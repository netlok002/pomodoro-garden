const STAGE_SECONDS = 5 * 60

export type StageName = 'seed' | 'sprout' | 'stem' | 'bud' | 'bloom'

const MIDDLE_STAGES: StageName[] = ['sprout', 'stem', 'bud']

export function bloomStageFor(durationSeconds: number): number {
  return durationSeconds / STAGE_SECONDS
}

export function growthStage(elapsedSeconds: number, durationSeconds: number): number {
  return Math.min(Math.floor(elapsedSeconds / STAGE_SECONDS), bloomStageFor(durationSeconds))
}

export function stageName(stage: number, bloomStage: number): StageName {
  if (stage <= 0) return 'seed'
  if (stage >= bloomStage) return 'bloom'
  const middleCount = bloomStage - 1
  const index = Math.floor(((stage - 1) * MIDDLE_STAGES.length) / middleCount)
  return MIDDLE_STAGES[index]
}
