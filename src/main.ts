import './style.css'
import { initSession } from './session.ts'
import { initDevSpeed } from './devSpeed.ts'
import { initClickSounds } from './clickSounds.ts'
import { createSpotify } from './spotify.ts'
import { openRadio } from './radioView.ts'
import { SKETCH_FILTERS, bookArt, flowerboxArt, radioArt } from './art.ts'

initDevSpeed()
initClickSounds()

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  ${SKETCH_FILTERS}
  <main>
    <button id="book-button" class="book-button" title="Flower Book" aria-label="Flower Book">${bookArt()}</button>
    <div id="forecast" class="forecast"></div>
    <div id="plant"></div>
    <div id="timer-display"></div>
    <div id="controls"></div>
    <div class="garden-wrap">
      <div id="garden" class="garden"></div>
      <div class="flowerbox">${flowerboxArt()}</div>
      <button id="radio-button" class="radio-button" title="Radio" aria-label="Radio">${radioArt()}</button>
    </div>
    <p id="note" class="note"></p>
  </main>
`

const element = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!

const spotify = createSpotify()

initSession(
  {
    forecast: element('forecast'),
    plant: element('plant'),
    display: element('timer-display'),
    controls: element('controls'),
    garden: element('garden'),
    note: element('note'),
    bookButton: element('book-button'),
  },
  {
    onFocusStart: () => void spotify.focusStart(),
    onFocusEnd: () => void spotify.focusEnd(),
  },
)

element('radio-button').addEventListener('click', () => openRadio(spotify))

// Coming back from Spotify's login page: finish connecting, then show the radio to pick a playlist.
void spotify.finishLogin().then((returnedFromSpotify) => {
  if (returnedFromSpotify) openRadio(spotify)
})
