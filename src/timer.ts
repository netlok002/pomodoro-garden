export const DEFAULT_DURATION_SECONDS = 25 * 60

export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function startTimer(display: HTMLElement, durationSeconds: number, onDone: () => void): () => void {
  let remainingSeconds = durationSeconds
  let intervalId: number | undefined

  const render = () => {
    display.textContent = formatTime(remainingSeconds)
  }

  const tick = () => {
    remainingSeconds -= 1
    render()
    if (remainingSeconds <= 0) {
      clearInterval(intervalId)
      onDone()
    }
  }

  render()
  intervalId = setInterval(tick, 1000)

  return () => clearInterval(intervalId)
}
