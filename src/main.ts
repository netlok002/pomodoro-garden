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
      <button id="radio-button" class="radio-button" aria-label="Radio" aria-describedby="radio-bubble">${radioArt()}</button>
      <div id="radio-bubble" class="radio-bubble" role="status" hidden><span class="radio-bubble-text"></span></div>
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

const radio = element('radio-button')
radio.addEventListener('click', () => openRadio(spotify))

// Hovering the radio shows what's playing in a speech bubble. Song names come from
// Spotify, so they're only ever set as text.
const bubble = element('radio-bubble')
const bubbleText = bubble.querySelector<HTMLElement>('.radio-bubble-text')!
let hovering = false
const showNowPlaying = async () => {
  hovering = true
  bubbleText.textContent = 'Tuning in…'
  bubble.hidden = false
  const text = await spotify.nowPlaying()
  if (hovering) bubbleText.textContent = text
}
const hideNowPlaying = () => {
  hovering = false
  bubble.hidden = true
}
radio.addEventListener('mouseenter', () => void showNowPlaying())
radio.addEventListener('focus', () => void showNowPlaying())
radio.addEventListener('mouseleave', hideNowPlaying)
radio.addEventListener('blur', hideNowPlaying)

// Coming back from Spotify's login page: finish connecting, then show the radio to pick a playlist.
void spotify.finishLogin().then((returnedFromSpotify) => {
  if (returnedFromSpotify) openRadio(spotify)
})
