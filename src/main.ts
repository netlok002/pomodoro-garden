import './style.css'
import { initSession } from './session.ts'
import { initDevSpeed } from './devSpeed.ts'
import { SKETCH_FILTERS } from './art.ts'

initDevSpeed()

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  ${SKETCH_FILTERS}
  <main>
    <div id="forecast" class="forecast"></div>
    <div id="plant"></div>
    <div id="timer-display"></div>
    <div id="controls"></div>
    <div id="garden" class="garden"></div>
    <p id="note" class="note"></p>
  </main>
  <button id="book-link" class="book-link">Flower Book</button>
`

const element = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!

initSession({
  forecast: element('forecast'),
  plant: element('plant'),
  display: element('timer-display'),
  controls: element('controls'),
  garden: element('garden'),
  note: element('note'),
  bookLink: element('book-link'),
})
