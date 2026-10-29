import { startTimer, formatTime } from './timer.ts'
import { isFull, placePlant, removePlant, type Garden } from './garden.ts'
import { recordPick, type Book } from './book.ts'
import { localDateKey } from './dates.ts'
import { SPECIES, getSpecies } from './species.ts'
import { loadState, saveState } from './storage.ts'
import { playDoneSound, playStartSound } from './sound.ts'
import { openSeedPicker } from './seedPicker.ts'
import { renderGarden } from './gardenView.ts'
import { renderGrowingPlant, renderSeedChoice } from './plantView.ts'

// What is growing right now. slotIndex is set when resuming a sprout already in the garden.
interface Planting {
  speciesId: string
  startElapsedSeconds: number
  slotIndex?: number
}

export function initSession(
  display: HTMLElement,
  controls: HTMLElement,
  plantContainer: HTMLElement,
  gardenContainer: HTMLElement,
  noteContainer: HTMLElement,
) {
  const saved = loadState()
  let garden: Garden = saved.garden
  let book: Book = saved.book
  let selectedSpeciesId = SPECIES[0].id

  const save = () => saveState({ garden, book, lastSeen: Date.now() })

  const updateGarden = (next: Garden) => {
    garden = next
    save()
  }

  const pickFlower = (slotIndex: number) => {
    const flower = garden[slotIndex]
    if (flower.kind !== 'flower') return
    book = recordPick(book, flower.speciesId, 'normal', localDateKey(new Date()))
    updateGarden(removePlant(garden, slotIndex))
    goIdle(`Pressed a ${getSpecies(flower.speciesId).name} into your book.`)
  }

  const goIdle = (note = '') => {
    const species = getSpecies(selectedSpeciesId)
    renderSeedChoice(plantContainer, species)
    renderGarden(gardenContainer, garden, {
      onSproutClick: (slotIndex) => {
        const sprout = garden[slotIndex]
        if (sprout.kind !== 'sprout') return
        goRunning({ speciesId: sprout.speciesId, startElapsedSeconds: sprout.elapsedSeconds, slotIndex })
      },
      onFlowerClick: pickFlower,
    })
    noteContainer.textContent = note

    display.innerHTML = `<span id="timer-value" class="timer-value">${formatTime(species.durationMinutes * 60)}</span>`
    display.querySelector<HTMLSpanElement>('#timer-value')!.addEventListener('click', () => {
      openSeedPicker(selectedSpeciesId, (speciesId) => {
        selectedSpeciesId = speciesId
        goIdle()
      })
    })

    if (isFull(garden)) {
      controls.innerHTML = '<div class="select-option disabled">Your garden is full — click a flower to pick it</div>'
      return
    }
    controls.innerHTML = '<div id="start-button" class="select-option selected">❯ Plant</div>'
    controls.querySelector<HTMLDivElement>('#start-button')!.addEventListener('click', () => {
      goRunning({ speciesId: selectedSpeciesId, startElapsedSeconds: 0 })
    })
  }

  const goRunning = (planting: Planting) => {
    const species = getSpecies(planting.speciesId)
    const totalSeconds = species.durationMinutes * 60
    const remainingSeconds = totalSeconds - planting.startElapsedSeconds

    playStartSound()
    noteContainer.textContent = ''
    renderGarden(gardenContainer, garden)
    renderGrowingPlant(plantContainer, species, planting.startElapsedSeconds)
    controls.innerHTML = `
      <div class="select-option disabled">&nbsp; Growing...</div>
      <div id="cancel-button" class="select-option">❯ Stop</div>
    `

    const onDone = () => {
      playDoneSound()
      updateGarden(placePlant(garden, { kind: 'flower', speciesId: species.id }, planting.slotIndex))
      goIdle()
    }

    const onTick = (elapsedSeconds: number) => {
      renderGrowingPlant(plantContainer, species, planting.startElapsedSeconds + elapsedSeconds)
    }

    const cancelTimer = startTimer(display, remainingSeconds, onDone, onTick)
    controls.querySelector<HTMLDivElement>('#cancel-button')!.addEventListener('click', () => {
      const grownSeconds = planting.startElapsedSeconds + cancelTimer()
      if (grownSeconds > 0) {
        updateGarden(
          placePlant(garden, { kind: 'sprout', speciesId: species.id, elapsedSeconds: grownSeconds }, planting.slotIndex),
        )
      }
      goIdle()
    })
  }

  goIdle()
}
