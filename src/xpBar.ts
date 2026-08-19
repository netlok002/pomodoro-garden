import { LEVEL_THRESHOLDS, MAX_LEVEL, MAX_XP, getLevel } from './levels.ts'
import type { CreatureState } from './creature.ts'

export function renderXpBar(container: HTMLElement, state: CreatureState) {
  const level = getLevel(state.xp)
  const isMaxLevel = level >= MAX_LEVEL

  const levelStartXp = LEVEL_THRESHOLDS[level - 1]
  const levelEndXp = isMaxLevel ? MAX_XP : LEVEL_THRESHOLDS[level]
  const fillPercent = isMaxLevel ? 100 : ((state.xp - levelStartXp) / (levelEndXp - levelStartXp)) * 100

  container.innerHTML = `
    <div class="xp-bar-level">Lv ${level}</div>
    <div class="xp-bar-track">
      <div class="xp-bar-fill" style="height: ${fillPercent}%"></div>
    </div>
  `
}
