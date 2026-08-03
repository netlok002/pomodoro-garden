export type Rating = 'rough' | 'okay' | 'great'

export interface CreatureState {
  xp: number
}

const RATING_XP: Record<Rating, number> = {
  rough: 1,
  okay: 3,
  great: 5,
}

const MOOD_TIERS = [
  { minXp: 10, mood: 'Thriving', art: '\\(^o^)/' },
  { minXp: 4, mood: 'Content', art: '(^_^)' },
  { minXp: 0, mood: 'Low', art: '(-_-)' },
]

function getMoodTier(xp: number) {
  return MOOD_TIERS.find((tier) => xp >= tier.minXp)!
}

export function applyRating(state: CreatureState, rating: Rating): CreatureState {
  return { xp: state.xp + RATING_XP[rating] }
}

export function renderCreature(container: HTMLElement, state: CreatureState) {
  const { mood, art } = getMoodTier(state.xp)
  container.innerHTML = `
    <pre>${art}</pre>
    <p>${mood} — XP: ${state.xp}</p>
  `
}
