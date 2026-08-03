const DURATION_SECONDS = 5 // TODO: back to 25 * 60 (or user-configurable) once basic loop is tested

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function startTimer(display: HTMLElement, onDone: () => void) {
  let remainingSeconds = DURATION_SECONDS
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
}
