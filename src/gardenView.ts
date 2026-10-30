import { GARDEN_CAPACITY, type Garden } from './garden.ts'
import { getSpecies } from './species.ts'
import { plantArt } from './plantView.ts'
import { speciesArt } from './art.ts'

// Plants grow from the flowerbox's soil, so they skip their own patch of ground.
const IN_BOX = { ground: false }

export interface GardenHandlers {
  onSproutClick: (slotIndex: number) => void
  onFlowerClick: (slotIndex: number) => void
}

// Handlers are omitted while a timer runs, so nothing can be resumed or picked mid-session.
export function renderGarden(container: HTMLElement, garden: Garden, handlers?: GardenHandlers) {
  const clickable = handlers ? ' clickable' : ''

  const slots = Array.from({ length: GARDEN_CAPACITY }, (_, index) => {
    const plant = garden[index]
    if (!plant) return '<div class="garden-slot empty"></div>'

    const species = getSpecies(plant.speciesId)
    if (plant.kind === 'flower') {
      const title = handlers ? `Pick ${species.name}` : species.name
      const perfect = plant.perfect ? ' perfect' : ''
      return `<div class="garden-slot flower${perfect}${clickable}" data-slot="${index}" title="${title}">${speciesArt(species.id, IN_BOX)}</div>`
    }

    const minutesLeft = Math.ceil((species.durationMinutes * 60 - plant.elapsedSeconds) / 60)
    return `
      <div class="garden-slot sprout${clickable}" data-slot="${index}" title="${species.name} sprout — ${minutesLeft} min left">
        ${plantArt(species, plant.elapsedSeconds, IN_BOX)}
        <span class="garden-slot-minutes">${minutesLeft}m</span>
      </div>
    `
  }).join('')

  container.innerHTML = slots

  if (!handlers) return
  container.querySelectorAll<HTMLElement>('.garden-slot.sprout').forEach((slot) => {
    slot.addEventListener('click', () => handlers.onSproutClick(Number(slot.dataset.slot)))
  })
  container.querySelectorAll<HTMLElement>('.garden-slot.flower').forEach((slot) => {
    slot.addEventListener('click', () => handlers.onFlowerClick(Number(slot.dataset.slot)))
  })
}
