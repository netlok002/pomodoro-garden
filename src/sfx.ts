// Sound effects synthesised with the Web Audio API, so no sound files are needed.

const WOOD_BLOCK_PITCH = 760
const WOOD_BLOCK_SPREAD_SEMITONES = 1.5

let context: AudioContext | undefined

// Browsers only allow audio after the user interacts, so the context is made on first use.
function audio(): AudioContext {
  context ??= new AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

// A pitch somewhere within ± spread semitones of base. random() is 0..1; 0.5 gives base exactly.
export function randomizedPitch(base: number, spreadSemitones: number, random: () => number = Math.random): number {
  const semitones = (random() * 2 - 1) * spreadSemitones
  return base * 2 ** (semitones / 12)
}

// A short burst of white noise, the raw material for clicks and paper sounds.
function noiseSource(ctx: AudioContext, seconds: number): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate)
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  return source
}

// A tone that strikes and fades away, like a struck object.
function strike(ctx: AudioContext, frequency: number, start: number, peak: number, decay: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + decay)
  osc.connect(gain).connect(ctx.destination)
  osc.start(start)
  osc.stop(start + decay + 0.02)
}

// Filtered noise with a volume shape; sweep moves the filter for a rustle.
function noiseBurst(
  ctx: AudioContext,
  start: number,
  seconds: number,
  peak: number,
  filter: { type: BiquadFilterType; from: number; to: number; q?: number },
) {
  const source = noiseSource(ctx, seconds)
  const bandpass = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  bandpass.type = filter.type
  bandpass.Q.value = filter.q ?? 0.8
  bandpass.frequency.setValueAtTime(filter.from, start)
  bandpass.frequency.exponentialRampToValueAtTime(filter.to, start + seconds)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + seconds * 0.15)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds)
  source.connect(bandpass).connect(gain).connect(ctx.destination)
  source.start(start)
}

// A soft, hollow "tok": a fundamental, a quick inharmonic overtone, and a tiny click.
export function playWoodBlock() {
  const ctx = audio()
  const now = ctx.currentTime
  const pitch = randomizedPitch(WOOD_BLOCK_PITCH, WOOD_BLOCK_SPREAD_SEMITONES)
  strike(ctx, pitch, now, 0.16, 0.13)
  strike(ctx, pitch * 2.76, now, 0.035, 0.05)
  noiseBurst(ctx, now, 0.012, 0.05, { type: 'bandpass', from: 2500, to: 2500, q: 1.5 })
}

// A quick riffle of a few pages as the book opens.
export function playBookOpen() {
  playPageFlips(2 + Math.floor(Math.random() * 3))
}

// One or two pages settling as the book closes.
export function playBookClose() {
  playPageFlips(1 + Math.floor(Math.random() * 2))
}

export interface PageFlip {
  delay: number
  duration: number
  brightness: number
}

const between = (min: number, max: number, random: () => number) => min + (max - min) * random()

// Timing and tone for a riffle of page flips, each one a little different.
export function pageFlipPlan(count: number, random: () => number = Math.random): PageFlip[] {
  const flips: PageFlip[] = []
  for (let i = 0; i < count; i++) {
    const previous = flips[i - 1]
    const delay = previous ? previous.delay + previous.duration * 0.6 + between(0.03, 0.09, random) : 0
    flips.push({ delay, duration: between(0.07, 0.14, random), brightness: between(1600, 3200, random) })
  }
  return flips
}

// A soft papery swish that swells and fades, then a tiny low flap as the page lands.
function playPageFlip(ctx: AudioContext, start: number, { duration, brightness }: PageFlip) {
  const swish = noiseSource(ctx, duration)
  const filter = ctx.createBiquadFilter()
  const gain = ctx.createGain()
  filter.type = 'bandpass'
  filter.Q.value = 1.1
  filter.frequency.setValueAtTime(brightness * 0.7, start)
  filter.frequency.exponentialRampToValueAtTime(brightness, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(0.045, start + duration * 0.6)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  swish.connect(filter).connect(gain).connect(ctx.destination)
  swish.start(start)

  noiseBurst(ctx, start + duration * 0.85, 0.035, 0.03, { type: 'lowpass', from: 700, to: 400 })
}

function playPageFlips(count: number) {
  const ctx = audio()
  const now = ctx.currentTime
  for (const flip of pageFlipPlan(count)) playPageFlip(ctx, now + flip.delay, flip)
}
