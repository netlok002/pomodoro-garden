// Placeholder line drawings, swapped for hand-drawn art later.
// Every drawing sits on a 48x48 canvas with the ground line at y = 44.

type GrowingStage = 'seed' | 'sprout' | 'stem' | 'bud'

const GROUND = 'M9 44 C17 43 31 45 39 44'

// Filters that make each stroke wobble like a pencil line. Injected once into the page.
export const SKETCH_FILTERS = `
  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <filter id="sketch-a" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="1.6" />
      </filter>
      <filter id="sketch-b" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="11" />
        <feDisplacementMap in="SourceGraphic" scale="2.6" />
      </filter>
    </defs>
  </svg>
`

const pointAt = (cx: number, cy: number, radius: number, angleDeg: number) => {
  const angle = (Math.PI / 180) * angleDeg
  return `${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`
}

// A spiky star outline alternating between an inner and outer radius.
function burst(cx: number, cy: number, inner: number, outer: number, spikes: number): string {
  const points = Array.from({ length: spikes * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner
    return pointAt(cx, cy, radius, (360 / (spikes * 2)) * index - 90)
  })
  return `M${points.join(' L')} Z`
}

// Short rays fanning out between two angles.
function rays(cx: number, cy: number, from: number, to: number, count: number, inner: number, outer: number): string {
  return Array.from({ length: count }, (_, index) => {
    const angle = from + ((to - from) / (count - 1)) * index
    return `M${pointAt(cx, cy, inner, angle)} L${pointAt(cx, cy, outer, angle)}`
  }).join(' ')
}

// Draws the paths twice with different wobble so the lines read as a sketch.
function sketch(paths: string): string {
  return `
    <svg class="sketch" viewBox="0 0 48 48" aria-hidden="true">
      <path d="${paths}" filter="url(#sketch-a)" />
      <path class="sketch-echo" d="${paths}" filter="url(#sketch-b)" />
    </svg>
  `
}

const STAGES: Record<GrowingStage, string> = {
  seed: `${GROUND} M21 41 C21 38 27 38 27 41 C27 43 21 43 21 41 Z`,
  sprout: `${GROUND} M24 44 C24 40 23 37 24 34 M24 37 C20 36 18 33 18 30 C21 31 23 33 24 37 M24 36 C28 35 30 32 30 29 C27 30 25 32 24 36`,
  stem: `${GROUND} M24 44 C23 36 25 28 24 20 M24 33 C19 32 16 28 16 25 C20 26 23 29 24 33 M24 27 C29 26 32 22 32 19 C28 20 25 23 24 27`,
  bud: `${GROUND} M24 44 C23 36 25 26 24 18 M24 33 C19 32 16 28 16 25 C20 26 23 29 24 33 M24 18 C19 14 21 8 24 5 C27 8 29 14 24 18 M24 18 C23 13 23 9 24 5`,
}

const BLOOMS: Record<string, string> = {
  // Mushroom cap with glowing dashes around it.
  glowcap: `${GROUND} M24 44 C22 38 26 32 24 26 M11 26 C12 14 36 14 37 26 C30 24 18 24 11 26 Z M19 20 a1.2 1.2 0 1 0 0.1 0 M28 19 a1.4 1.4 0 1 0 0.1 0 M24 23 a1 1 0 1 0 0.1 0 M8 17 L5 15 M40 17 L43 15 M24 11 L24 7`,
  // Twitchy starburst on a crooked stem.
  zipbloom: `${GROUND} M24 44 C27 36 21 30 24 22 M24 34 C28 33 30 31 31 28 ${burst(24, 15, 3.5, 10, 7)} M24 15 a1.5 1.5 0 1 0 0.1 0`,
  // Fuzzy puff of overlapping circles.
  murkmoss: `${GROUND} M24 44 C24 40 25 35 24 31 M24 22 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M18 26 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M30 26 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M24 15 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M14 13 l-2 -2 M34 13 l2 -2 M24 8 l0 -3`,
  // Crystal petals with facet lines.
  prismpetal: `${GROUND} M24 44 L24 25 M24 25 L18 14 L24 4 L30 14 Z M18 14 L30 14 M24 4 L24 25 M23 23 L14 19 L9 10 L19 13 Z M25 23 L34 19 L39 10 L29 13 Z`,
  // A cup that holds rain, with a drooping tongue and a drip.
  driptongue: `${GROUND} M24 44 C20 38 27 32 24 25 M13 13 C13 27 35 27 35 13 M13 13 C18 10 30 10 35 13 C30 16 18 16 13 13 M29 22 C33 27 34 31 31 34 M31 36 C30 37.5 30 39 31 39 C32 39 32 37.5 31 36`,
  // Jellyfish-like bell trailing curly tendrils.
  veilvine: `${GROUND} M24 44 C22 40 26 36 24 32 M13 20 C13 7 35 7 35 20 C30 18 18 18 13 20 Z M17 20 C15 24 19 26 17 30 M24 19 C26 23 22 26 24 31 M31 20 C33 24 29 26 31 30 M18 13 C21 11 27 11 30 13`,
  // An eye-shaped bloom with lashes.
  gloomorchid: `${GROUND} M24 44 C25 36 23 30 24 25 M9 16 C16 6 32 6 39 16 C32 26 16 26 9 16 Z M24 16 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M24 12.5 L24 19.5 M14 10 L11 6 M24 7 L24 2 M34 10 L37 6 M19 8 L17 3.5 M29 8 L31 3.5`,
  // Solar-panel head with a crown of rays and spiky leaves.
  'solar-thistle': `${GROUND} M24 44 L24 25 M24 36 L18 31 L21 34 L16 33 M24 33 L30 28 L27 31 L32 30 M24 19 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M18 19 L30 19 M24 13 L24 25 ${rays(24, 19, -170, -10, 7, 8, 14)}`,
}

export function stageArt(stage: GrowingStage): string {
  return sketch(STAGES[stage])
}

export function speciesArt(speciesId: string): string {
  const paths = BLOOMS[speciesId]
  if (!paths) throw new Error(`No art for species: ${speciesId}`)
  return sketch(paths)
}
