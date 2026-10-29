import { GARDEN_CAPACITY, type Garden } from './garden.ts'
import { getSpecies } from './species.ts'
import { plantGlyph } from './plantView.ts'

// onSproutClick is omitted while a timer runs, so sprouts can't be resumed mid-session.
export function renderGarden(container: HTMLElement, garden: Garden, onSproutClick?: (slotIndex: number) => void) {
  const slots = Array.from({ length: GARDEN_CAPACITY }, (_, index) => {
    const plant = garden[index]
    if (!plant) return '<div class="garden-slot empty">·</div>'

    const species = getSpecies(plant.speciesId)
    if (plant.kind === 'flower') {
      return `<div class="garden-slot" title="${species.name}">${species.glyph}</div>`
    }

    const minutesLeft = Math.ceil((species.durationMinutes * 60 - plant.elapsedSeconds) / 60)
    const clickable = onSproutClick ? ' clickable' : ''
    return `
      <div class="garden-slot sprout${clickable}" data-slot="${index}" title="${species.name} sprout — ${minutesLeft} min left">
        ${plantGlyph(species, plant.elapsedSeconds)}
        <span class="garden-slot-minutes">${minutesLeft}m</span>
      </div>
    `
  }).join('')

  container.innerHTML = slots

  if (onSproutClick) {
    container.querySelectorAll<HTMLElement>('.garden-slot.sprout').forEach((slot) => {
      slot.addEventListener('click', () => onSproutClick(Number(slot.dataset.slot)))
    })
  }
}
