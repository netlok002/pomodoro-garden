import './style.css'
import { initSession } from './session.ts'
import { initDevSpeed } from './devSpeed.ts'
import { initClickSounds } from './clickSounds.ts'
import { createSpotify } from './spotify.ts'
import { openRadio } from './radioView.ts'
import { SKETCH_FILTERS, bookArt, flowerboxArt, noteArt, radioArt } from './art.ts'

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
      <div id="radio-notes" class="radio-notes" aria-hidden="true" hidden>
        <span class="radio-note note-1">${noteArt('single')}</span>
        <span class="radio-note note-2">${noteArt('pair')}</span>
        <span class="radio-note note-3">${noteArt('single')}</span>
      </div>
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
    onFocusStart: () => void spotify.focusStart().then(checkPlayingSoon),
    onFocusEnd: () => void spotify.focusEnd().then(checkPlayingSoon),
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

// Music notes float above the radio while Spotify is playing. Spotify can't tell us when
// playback changes, so we ask: every 15 seconds while the tab is visible, when the
// player comes back to the tab, and shortly after each session starts or ends.
const notes = element('radio-notes')
spotify.onPlayingChange((playing) => (notes.hidden = !playing))

const PLAYING_CHECK_MS = 15_000
const checkPlaying = () => {
  if (document.visibilityState === 'visible') void spotify.checkPlaying()
}
function checkPlayingSoon() {
  setTimeout(checkPlaying, 2_000)
}
setInterval(checkPlaying, PLAYING_CHECK_MS)
document.addEventListener('visibilitychange', checkPlaying)
checkPlaying()
