import { startTimer, formatTime, DEFAULT_DURATION_SECONDS } from './timer.ts'
import { applyRating, renderCreature, type CreatureState, type Rating } from './creature.ts'
import { loadState, saveState } from './storage.ts'
import { playDoneSound, playStartSound } from './sound.ts'
import { renderSelectableList } from './select.ts'
import { openTimePicker } from './timePicker.ts'
import { renderXpBar } from './xpBar.ts'

const RATINGS: Rating[] = ['rough', 'okay', 'great']

export function initSession(
  display: HTMLElement,
  controls: HTMLElement,
  creatureContainer: HTMLElement,
  xpBarContainer: HTMLElement,
) {
  let creature: CreatureState = { xp: loadState().xp }
  let durationSeconds = DEFAULT_DURATION_SECONDS

  const goIdle = () => {
    display.innerHTML = `<span id="timer-value" class="timer-value">${formatTime(durationSeconds)}</span>`
    display.querySelector<HTMLSpanElement>('#timer-value')!.addEventListener('click', () => {
      openTimePicker(durationSeconds, (seconds) => {
        durationSeconds = seconds
        goIdle()
      })
    })

    controls.innerHTML = '<div id="start-button" class="select-option selected">❯ Start</div>'
    controls.querySelector<HTMLDivElement>('#start-button')!.addEventListener('click', goRunning)
  }

  const goRunning = () => {
    playStartSound()
    controls.innerHTML = `
      <div class="select-option disabled">&nbsp; Running...</div>
      <div id="cancel-button" class="select-option">❯ Cancel</div>
    `
    const cancelTimer = startTimer(display, durationSeconds, goRating)
    controls.querySelector<HTMLDivElement>('#cancel-button')!.addEventListener('click', () => {
      cancelTimer()
      goIdle()
    })
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
        renderXpBar(xpBarContainer, creature)
        goIdle()
      },
    )
  }

  renderCreature(creatureContainer, creature)
  renderXpBar(xpBarContainer, creature)
  goIdle()
}
