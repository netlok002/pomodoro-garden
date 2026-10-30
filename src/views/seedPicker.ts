import { openModal } from './modal.ts'
import { SPECIES } from '../game/species.ts'
import { speciesArt } from '../art/art.ts'
import { pointOnCircle, wedgePath } from './wheel.ts'

const ART_RADIUS = 52
const ART_SIZE = 30
const MINUTES_RADIUS = 78
const WEDGE_DEGREES = 360 / SPECIES.length

export function openSeedPicker(currentSpeciesId: string, onSelect: (speciesId: string) => void) {
  openModal((body, close) => {
    const wedges = SPECIES.map((species, index) => {
      const startAngle = index * WEDGE_DEGREES
      const middleAngle = startAngle + WEDGE_DEGREES / 2
      const art = pointOnCircle(middleAngle, ART_RADIUS)
      const minutes = pointOnCircle(middleAngle, MINUTES_RADIUS)
      const isSelected = species.id === currentSpeciesId
      return `
        <path
          class="wheel-wedge${isSelected ? ' selected' : ''}"
          data-species-id="${species.id}"
          d="${wedgePath(startAngle, startAngle + WEDGE_DEGREES)}"
        ><title>${species.name}</title></path>
        <foreignObject class="wheel-art" x="${art.x - ART_SIZE / 2}" y="${art.y - ART_SIZE / 2}" width="${ART_SIZE}" height="${ART_SIZE}">${speciesArt(species.id)}</foreignObject>
        <text class="wheel-label" x="${minutes.x}" y="${minutes.y}">${species.durationMinutes}</text>
      `
    }).join('')

    body.innerHTML = `
      <svg class="wheel" viewBox="0 0 200 200">
        ${wedges}
      </svg>
    `

    const onClick = (event: MouseEvent) => {
      const target = (event.target as SVGElement).closest<SVGPathElement>('.wheel-wedge')
      if (!target) return
      onSelect(target.dataset.speciesId!)
      close()
    }

    body.addEventListener('click', onClick)
    return () => body.removeEventListener('click', onClick)
  })
}
