import { getSpeed } from '../util/devSpeed.ts'

const TICK_MS = 100

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Returns a cancel function that stops the timer and reports how many seconds ran.
export function startTimer(
  display: HTMLElement,
  durationSeconds: number,
  onDone: () => void,
  onTick: (elapsedSeconds: number) => void = () => {},
): () => number {
  let remainingSeconds = durationSeconds
  let intervalId: number | undefined

  const elapsedSeconds = () => Math.floor(durationSeconds - Math.max(0, remainingSeconds))

  const render = () => {
    display.textContent = formatTime(Math.max(0, Math.round(remainingSeconds)))
  }

  const tick = () => {
    remainingSeconds -= (TICK_MS / 1000) * getSpeed()
    render()
    onTick(elapsedSeconds())
    if (remainingSeconds <= 0) {
      clearInterval(intervalId)
      onDone()
    }
  }

  render()
  intervalId = setInterval(tick, TICK_MS)

  return () => {
    clearInterval(intervalId)
    return elapsedSeconds()
  }
}
