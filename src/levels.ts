export const MAX_LEVEL = 20

const xpToAdvance = (level: number) => 5 * level + 5

// LEVEL_THRESHOLDS[i] = total cumulative XP needed to reach level i + 1
export const LEVEL_THRESHOLDS: number[] = [0]
for (let level = 1; level < MAX_LEVEL; level++) {
  LEVEL_THRESHOLDS.push(LEVEL_THRESHOLDS[level - 1] + xpToAdvance(level))
}

export const MAX_XP = LEVEL_THRESHOLDS[MAX_LEVEL - 1]

export function getLevel(xp: number): number {
  let level = 1
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp < LEVEL_THRESHOLDS[i]) break
    level = i + 1
  }
  return level
}
