export type Speed = 1 | 4 | 20

let currentSpeed: Speed = 1

export function getSpeed(): Speed {
  return currentSpeed
}

export function initDevSpeed() {
  const badge = document.createElement('div')
  badge.className = 'dev-speed-badge'
  badge.style.display = 'none'
  document.body.appendChild(badge)

  const setSpeed = (speed: Speed) => {
    currentSpeed = speed
    badge.textContent = `${speed}x`
    badge.style.display = speed === 1 ? 'none' : 'block'
  }

  document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey || !event.shiftKey) return
    if (event.code === 'Digit1') setSpeed(1)
    else if (event.code === 'Digit2') setSpeed(4)
    else if (event.code === 'Digit3') setSpeed(20)
  })
}
