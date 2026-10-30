import './style.css'
import { initSession } from './session.ts'
import { initDevSpeed } from './devSpeed.ts'
import { initClickSounds } from './clickSounds.ts'
import { SKETCH_FILTERS, bookArt, flowerboxArt } from './art.ts'

initDevSpeed()
initClickSounds()

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  ${SKETCH_FILTERS}
  <main>
    <div id="forecast" class="forecast"></div>
    <div id="plant"></div>
    <div id="timer-display"></div>
    <div id="controls"></div>
    <div class="garden-wrap">
      <div id="garden" class="garden"></div>
      <div class="flowerbox">${flowerboxArt()}</div>
      <button id="book-button" class="book-button" title="Flower Book" aria-label="Flower Book">${bookArt()}</button>
    </div>
    <p id="note" class="note"></p>
  </main>
`

const element = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!

initSession({
  forecast: element('forecast'),
  plant: element('plant'),
  display: element('timer-display'),
  controls: element('controls'),
  garden: element('garden'),
  note: element('note'),
  bookButton: element('book-button'),
})
