import { openModal } from './modal.ts'
import { SPECIES } from './species.ts'
import { speciesArt } from './art.ts'

const CENTER = 100
const RADIUS = 90
const ART_RADIUS = 52
const ART_SIZE = 30
const MINUTES_RADIUS = 78
const WEDGE_DEGREES = 360 / SPECIES.length

function pointOnCircle(angleDeg: number, radius: number) {
  const angleRad = (Math.PI / 180) * angleDeg
  return {
    x: CENTER + radius * Math.sin(angleRad),
    y: CENTER - radius * Math.cos(angleRad),
  }
}

function wedgePath(startAngle: number, endAngle: number): string {
  const start = pointOnCircle(startAngle, RADIUS)
  const end = pointOnCircle(endAngle, RADIUS)
  return `M ${CENTER},${CENTER} L ${start.x},${start.y} A ${RADIUS},${RADIUS} 0 0,1 ${end.x},${end.y} Z`
}

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
          class="seed-wedge${isSelected ? ' selected' : ''}"
          data-species-id="${species.id}"
          d="${wedgePath(startAngle, startAngle + WEDGE_DEGREES)}"
        ><title>${species.name}</title></path>
        <foreignObject class="seed-wedge-art" x="${art.x - ART_SIZE / 2}" y="${art.y - ART_SIZE / 2}" width="${ART_SIZE}" height="${ART_SIZE}">${speciesArt(species.id)}</foreignObject>
        <text class="seed-wedge-minutes" x="${minutes.x}" y="${minutes.y}">${species.durationMinutes}</text>
      `
    }).join('')

    body.innerHTML = `
      <svg class="seed-picker" viewBox="0 0 200 200">
        ${wedges}
      </svg>
    `

    const onClick = (event: MouseEvent) => {
      const target = (event.target as SVGElement).closest<SVGPathElement>('.seed-wedge')
      if (!target) return
      onSelect(target.dataset.speciesId!)
      close()
    }

    body.addEventListener('click', onClick)
    return () => body.removeEventListener('click', onClick)
  })
}
