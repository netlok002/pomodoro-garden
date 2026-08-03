import { startTimer } from './timer.ts'
import { applyRating, renderCreature, type CreatureState, type Rating } from './creature.ts'
import { loadState, saveState } from './storage.ts'
import { playDoneSound, playStartSound } from './sound.ts'
import { renderSelectableList } from './select.ts'

const RATINGS: Rating[] = ['rough', 'okay', 'great']

export function initSession(display: HTMLElement, controls: HTMLElement, creatureContainer: HTMLElement) {
  let creature: CreatureState = { xp: loadState().xp }

  const goIdle = () => {
    controls.innerHTML = '<div id="start-button" class="select-option selected">❯ Start</div>'
    controls.querySelector<HTMLDivElement>('#start-button')!.addEventListener('click', goRunning)
  }

  const goRunning = () => {
    playStartSound()
    controls.innerHTML = '<div class="select-option disabled">&nbsp; Running...</div>'
    startTimer(display, goRating)
  }

  const goRating = () => {
    playDoneSound()
    renderSelectableList(
      controls,
      RATINGS.map((rating) => ({ value: rating, label: rating })),
      (value) => {
        const rating = value as Rating
        creature = applyRating(creature, rating)
        saveState({ xp: creature.xp, lastSeen: Date.now() })
        renderCreature(creatureContainer, creature)
        goIdle()
      },
    )
  }

  renderCreature(creatureContainer, creature)
  goIdle()
}
