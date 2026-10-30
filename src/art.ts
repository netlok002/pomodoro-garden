import type { Weather } from './weather.ts'

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
function sketch(paths: string, viewBox = '0 0 48 48'): string {
  return `
    <svg class="sketch" viewBox="${viewBox}" aria-hidden="true">
      <path d="${paths}" filter="url(#sketch-a)" />
      <path class="sketch-echo" d="${paths}" filter="url(#sketch-b)" />
    </svg>
  `
}

const STAGES: Record<GrowingStage, string> = {
  seed: `M21 41 C21 38 27 38 27 41 C27 43 21 43 21 41 Z`,
  sprout: `M24 44 C24 40 23 37 24 34 M24 37 C20 36 18 33 18 30 C21 31 23 33 24 37 M24 36 C28 35 30 32 30 29 C27 30 25 32 24 36`,
  stem: `M24 44 C23 36 25 28 24 20 M24 33 C19 32 16 28 16 25 C20 26 23 29 24 33 M24 27 C29 26 32 22 32 19 C28 20 25 23 24 27`,
  bud: `M24 44 C23 36 25 26 24 18 M24 33 C19 32 16 28 16 25 C20 26 23 29 24 33 M24 18 C19 14 21 8 24 5 C27 8 29 14 24 18 M24 18 C23 13 23 9 24 5`,
}

const BLOOMS: Record<string, string> = {
  // Mushroom cap with glowing dashes around it.
  glowcap: `M24 44 C22 38 26 32 24 26 M11 26 C12 14 36 14 37 26 C30 24 18 24 11 26 Z M19 20 a1.2 1.2 0 1 0 0.1 0 M28 19 a1.4 1.4 0 1 0 0.1 0 M24 23 a1 1 0 1 0 0.1 0 M8 17 L5 15 M40 17 L43 15 M24 11 L24 7`,
  // Twitchy starburst on a crooked stem.
  zipbloom: `M24 44 C27 36 21 30 24 22 M24 34 C28 33 30 31 31 28 ${burst(24, 15, 3.5, 10, 7)} M24 15 a1.5 1.5 0 1 0 0.1 0`,
  // Fuzzy puff of overlapping circles.
  murkmoss: `M24 44 C24 40 25 35 24 31 M24 22 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 M18 26 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M30 26 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M24 15 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M14 13 l-2 -2 M34 13 l2 -2 M24 8 l0 -3`,
  // Crystal petals with facet lines.
  prismpetal: `M24 44 L24 25 M24 25 L18 14 L24 4 L30 14 Z M18 14 L30 14 M24 4 L24 25 M23 23 L14 19 L9 10 L19 13 Z M25 23 L34 19 L39 10 L29 13 Z`,
  // A cup that holds rain, with a drooping tongue and a drip.
  driptongue: `M24 44 C20 38 27 32 24 25 M13 13 C13 27 35 27 35 13 M13 13 C18 10 30 10 35 13 C30 16 18 16 13 13 M29 22 C33 27 34 31 31 34 M31 36 C30 37.5 30 39 31 39 C32 39 32 37.5 31 36`,
  // Jellyfish-like bell trailing curly tendrils.
  veilvine: `M24 44 C22 40 26 36 24 32 M13 20 C13 7 35 7 35 20 C30 18 18 18 13 20 Z M17 20 C15 24 19 26 17 30 M24 19 C26 23 22 26 24 31 M31 20 C33 24 29 26 31 30 M18 13 C21 11 27 11 30 13`,
  // An eye-shaped bloom with lashes.
  gloomorchid: `M24 44 C25 36 23 30 24 25 M9 16 C16 6 32 6 39 16 C32 26 16 26 9 16 Z M24 16 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M24 12.5 L24 19.5 M14 10 L11 6 M24 7 L24 2 M34 10 L37 6 M19 8 L17 3.5 M29 8 L31 3.5`,
  // Solar-panel head with a crown of rays and spiky leaves.
  'solar-thistle': `M24 44 L24 25 M24 36 L18 31 L21 34 L16 33 M24 33 L30 28 L27 31 L32 30 M24 19 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M18 19 L30 19 M24 13 L24 25 ${rays(24, 19, -170, -10, 7, 8, 14)}`,
}

// Plants stand on their own patch of ground, except in the flowerbox, which has its own soil.
export interface PlantArtOptions {
  ground?: boolean
}

const withGround = (paths: string, { ground = true }: PlantArtOptions) => (ground ? `${GROUND} ${paths}` : paths)

export function stageArt(stage: GrowingStage, options: PlantArtOptions = {}): string {
  return sketch(withGround(STAGES[stage], options))
}

export function speciesArt(speciesId: string, options: PlantArtOptions = {}): string {
  const paths = BLOOMS[speciesId]
  if (!paths) throw new Error(`No art for species: ${speciesId}`)
  return sketch(withGround(paths, options))
}

// A puffy cloud outline whose flat base sits at (x, y), scaled by s.
const cloud = (x: number, y: number, s = 1) =>
  `M${x - 10 * s} ${y} C${x - 14 * s} ${y} ${x - 14 * s} ${y - 7 * s} ${x - 9 * s} ${y - 7 * s} ` +
  `C${x - 8 * s} ${y - 13 * s} ${x + s} ${y - 14 * s} ${x + 3 * s} ${y - 9 * s} ` +
  `C${x + 7 * s} ${y - 12 * s} ${x + 13 * s} ${y - 8 * s} ${x + 11 * s} ${y - 3 * s} ` +
  `C${x + 14 * s} ${y - 2 * s} ${x + 13 * s} ${y} ${x + 10 * s} ${y} Z`

// A circle as a path, so it can join the other strokes.
const sun = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0`

const WEATHER_ART: Record<Weather, string> = {
  clear: `${sun(24, 24, 7)} ${rays(24, 24, 0, 315, 8, 11, 17)}`,
  'partly-cloudy': `${sun(29, 18, 6)} ${rays(29, 18, -150, 20, 5, 9, 13)} ${cloud(20, 36, 1)}`,
  overcast: `${cloud(29, 26, 0.85)} ${cloud(20, 37, 1.05)}`,
  rainy: `${cloud(24, 27, 1.1)} M17 32 L15 37 M24 32 L22 38 M31 32 L29 37 M20 39 L19 42 M27 40 L26 43`,
}

export function weatherArt(weather: Weather): string {
  return sketch(WEATHER_ART[weather])
}

// A four-pointed twinkle for the celebration screen.
export function sparkleArt(): string {
  return sketch('M24 8 C25 20 28 23 40 24 C28 25 25 28 24 40 C23 28 20 25 8 24 C20 23 23 20 24 8 Z')
}

// A closed book with a ribbon bookmark, for the Flower Book button.
export function bookArt(): string {
  return sketch(
    'M12 10 C18 9 32 9 37 10 L37 40 C32 39 18 39 12 40 Z M12 10 C10 11 10 39 12 40 ' +
      'M15 40 L15 43 C21 42.5 31 42.5 37 43 L37 40 M18 17 C23 16.5 27 16.5 31 17 M18 21 C22 20.6 25 20.6 28 21 ' +
      'M31 9.5 L31 18 L33 16 L35 18 L35 9.5 M22 31 C21 28 23 26 24 25 C25 26 27 28 26 31 C25 32 23 32 22 31 M24 31 L24 35',
  )
}

// A long wooden planter the garden grows in: lumpy soil, a rim plank, plank seams,
// a little wood grain and a knot, standing on two small feet. Drawn on a 320x64 canvas.
export function flowerboxArt(): string {
  const soil = 'M10 8 C40 5 70 9 100 7 C130 5 150 9 180 7 C215 5 250 9 280 7 C295 6 305 8 310 8'
  const rim = 'M4 10 L316 10 L316 18 L4 18 Z'
  const body = 'M8 18 L312 18 L305 52 L15 52 Z'
  const seams = 'M10 30 C80 29.5 240 30.5 310 30 M12 41 C90 40.5 230 41.5 308 41'
  const grain = 'M40 24 C60 22.5 80 25.5 100 24 M150 35.5 C170 34 195 37 215 35.5 M70 46.5 C85 45.5 100 47.5 115 46.5 M245 24.5 C255 23.5 262 25 270 24'
  const knot = 'M226 46 m-5 0 a5 2.6 0 1 0 10 0 a5 2.6 0 1 0 -10 0 M226 46 m-2 0 a2 1 0 1 0 4 0 a2 1 0 1 0 -4 0'
  const feet = 'M34 52 L34 59 L50 59 L50 52 M270 52 L270 59 L286 59 L286 52'
  return sketch(`${soil} ${rim} ${body} ${seams} ${grain} ${knot} ${feet}`, '0 0 320 64')
}

// An old tabletop radio with an arched top, round speaker grille, tuning dial,
// two knobs and a slanted antenna. Opens the music controls.
export function radioArt(): string {
  return sketch(
    'M7 21 C7 14 14 12 24 12 C34 12 41 14 41 21 L41 38 C33 38.6 15 38.6 7 38 Z ' +
      'M10 38.4 L10 41.5 M38 38.4 L38 41.5 M33 12.5 L40 4.5 M40 4.5 m-1 0 a1 1 0 1 0 2 0 a1 1 0 1 0 -2 0 ' +
      'M18 27 m-6.5 0 a6.5 6.5 0 1 0 13 0 a6.5 6.5 0 1 0 -13 0 M13 24 L23 24 M11.8 27 L24.2 27 M13 30 L23 30 ' +
      'M28 19 L37 19 L37 25 L28 25 Z M30 19 L30 20.5 M32.5 19 L32.5 20.5 M35 19 L35 20.5 M33.5 19 L32 25 ' +
      'M30.5 31.5 m-2.2 0 a2.2 2.2 0 1 0 4.4 0 a2.2 2.2 0 1 0 -4.4 0 M35.5 31.5 m-2.2 0 a2.2 2.2 0 1 0 4.4 0 a2.2 2.2 0 1 0 -4.4 0',
  )
}

// Little music notes that float above the radio while music plays.
const NOTES = {
  // An eighth note: filled-looking oval head (drawn as a loop), stem and a curled flag.
  single: 'M17 34 m-5 0 a5 3.6 -20 1 0 10 0 a5 3.6 -20 1 0 -10 0 M21.5 32.5 L21.5 10 C25 12 30 14 29 21',
  // Two beamed notes.
  pair:
    'M13 36 m-4.5 0 a4.5 3.2 -20 1 0 9 0 a4.5 3.2 -20 1 0 -9 0 M33 32 m-4.5 0 a4.5 3.2 -20 1 0 9 0 a4.5 3.2 -20 1 0 -9 0 ' +
    'M17 35 L17 13 M37 31 L37 9 M17 13 L37 9 M17 17 L37 13',
}

export function noteArt(kind: keyof typeof NOTES): string {
  return sketch(NOTES[kind])
}
