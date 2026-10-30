// The plant currently growing, kept in real time. Instead of counting timer ticks
// (which phones slow down or pause when locked), each update adds the real time that
// passed since the last one, so a locked phone catches up the moment it wakes.
import { getSpecies } from './species.ts'
import { addWeatherTime, type Weather, type WeatherTally } from '../weather/weather.ts'

export interface GrowingRun {
  speciesId: string
  elapsedSeconds: number
  weatherSeconds: WeatherTally
  // The garden slot of a resumed sprout; null for a fresh seed.
  slotIndex: number | null
  lastTickAt: number
}

interface ResumeFrom {
  elapsedSeconds: number
  weatherSeconds: WeatherTally
  slotIndex: number
}

export function startRun(speciesId: string, now: number, resume?: ResumeFrom): GrowingRun {
  return {
    speciesId,
    elapsedSeconds: resume?.elapsedSeconds ?? 0,
    weatherSeconds: resume?.weatherSeconds ?? {},
    slotIndex: resume?.slotIndex ?? null,
    lastTickAt: now,
  }
}

// speed is 1 except with the dev speed-up shortcuts.
export function advanceRun(run: GrowingRun, now: number, speed: number, weather: Weather): GrowingRun {
  const grownSeconds = (Math.max(0, now - run.lastTickAt) / 1000) * speed
  if (grownSeconds === 0) return { ...run, lastTickAt: now }
  return {
    ...run,
    elapsedSeconds: run.elapsedSeconds + grownSeconds,
    weatherSeconds: addWeatherTime(run.weatherSeconds, weather, grownSeconds),
    lastTickAt: now,
  }
}

export function isRunDone(run: GrowingRun): boolean {
  return run.elapsedSeconds >= getSpecies(run.speciesId).durationMinutes * 60
}
