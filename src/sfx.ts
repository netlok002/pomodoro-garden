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

// Cover lifting with a soft thump, then a page rustling over.
export function playBookOpen() {
  const ctx = audio()
  const now = ctx.currentTime
  strike(ctx, 140, now, 0.12, 0.12)
  noiseBurst(ctx, now + 0.04, 0.32, 0.07, { type: 'bandpass', from: 1200, to: 4200 })
}

// A page settling, then the cover landing with a deeper thump.
export function playBookClose() {
  const ctx = audio()
  const now = ctx.currentTime
  noiseBurst(ctx, now, 0.16, 0.05, { type: 'bandpass', from: 3500, to: 1400 })
  strike(ctx, 95, now + 0.13, 0.2, 0.18)
  noiseBurst(ctx, now + 0.13, 0.08, 0.06, { type: 'lowpass', from: 900, to: 300 })
}
