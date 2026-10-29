import './style.css'
import { initSession } from './session.ts'
import { initDevSpeed } from './devSpeed.ts'
import { SKETCH_FILTERS } from './art.ts'

initDevSpeed()

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  ${SKETCH_FILTERS}
  <main>
    <div id="plant"></div>
    <div id="timer-display"></div>
    <div id="controls"></div>
    <div id="garden" class="garden"></div>
  </main>
`

initSession(
  document.querySelector<HTMLDivElement>('#timer-display')!,
  document.querySelector<HTMLDivElement>('#controls')!,
  document.querySelector<HTMLDivElement>('#plant')!,
  document.querySelector<HTMLDivElement>('#garden')!,
)
